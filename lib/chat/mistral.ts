/**
 * Client minimal de l'API Mistral, côté serveur uniquement.
 * La clé n'est jamais exposée au navigateur : ce module n'est importé que
 * depuis app/api/chat/route.ts.
 */

export type ChatMessageParam =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string; name: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type StreamEvent =
  | { type: "text"; value: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "done" };

export const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

/**
 * Le cahier des charges indiquait « mistral-medium-3-5-26-04 », qui n'existe
 * pas sur l'API : les identifiants réels de cette famille sont
 * `mistral-medium-3-5`, `mistral-medium-2604` et `mistral-medium-latest`.
 * On épingle la version plutôt que de suivre `latest`, pour que le ton du
 * conseiller ne change pas sans prévenir.
 */
export const DEFAULT_MISTRAL_MODEL = "mistral-medium-3-5";

/**
 * Une variable d'environnement déclarée mais vide vaut une chaîne vide, pas
 * `undefined` : on retombe explicitement sur le modèle par défaut.
 */
export function mistralModel(): string {
  const configured = process.env.MISTRAL_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_MISTRAL_MODEL;
}

export class MistralError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Erreur sur laquelle réessayer ne servirait à rien (quota nul, clé invalide). */
    readonly fatal = false,
  ) {
    super(message);
    this.name = "MistralError";
  }
}

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

/** Attente conseillée par le serveur, en millisecondes, si elle est fournie. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(15000, Math.max(0, seconds * 1000));
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.min(15000, Math.max(0, date - Date.now()));
}

/** Appel avec délai maximal, réessais et repli exponentiel. */
async function callWithRetry(
  body: Record<string, unknown>,
  apiKey: string,
  { attempts = 4, timeoutMs = 30000 } = {},
): Promise<Response> {
  let lastError: unknown = null;
  let waitMs = 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(MISTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: body.stream === true ? "text/event-stream" : "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) return response;

      // Quota du compte à zéro : réessayer ne changera rien dans la seconde.
      // Mieux vaut basculer tout de suite sur la réponse de repli.
      if (response.status === 429 && response.headers.get("x-ratelimit-limit-req-minute") === "0") {
        throw new MistralError(
          "Le compte Mistral n'a aucun quota de requêtes : activez le plan de votre espace de travail sur console.mistral.ai.",
          429,
          true,
        );
      }

      if (!RETRYABLE.has(response.status) || attempt === attempts - 1) {
        const detail = await response.text().catch(() => "");
        throw new MistralError(
          `Mistral a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`,
          response.status,
        );
      }
      lastError = new MistralError(`Statut ${response.status}`, response.status);
      // Une limite de débit demande une pause franche : le repli court d'une
      // erreur réseau ne suffit pas, et l'API indique souvent le délai.
      const base = response.status === 429 ? 1500 : 400;
      waitMs = retryAfterMs(response) ?? base * 2 ** attempt;
    } catch (error) {
      if (error instanceof MistralError && (error.fatal || !RETRYABLE.has(error.status))) {
        throw error;
      }
      lastError = error;
      waitMs = 400 * 2 ** attempt;
      if (attempt === attempts - 1) break;
    } finally {
      clearTimeout(timer);
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw lastError instanceof Error
    ? lastError
    : new MistralError("Le conseiller n'a pas répondu.", 503);
}

type DeltaToolCall = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};

/**
 * Un tour de conversation en streaming. Le texte est renvoyé au fil de l'eau ;
 * les appels d'outils sont réassemblés puis émis en une fois à la fin du tour.
 */
export async function* streamChatTurn(
  messages: ChatMessageParam[],
  tools: unknown[],
  apiKey: string,
): AsyncGenerator<StreamEvent> {
  const response = await callWithRetry(
    {
      model: mistralModel(),
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 900,
      stream: true,
    },
    apiKey,
  );

  const body = response.body;
  if (!body) throw new MistralError("Réponse vide du conseiller.", 502);

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  const pending = new Map<number, { id: string; name: string; arguments: string }>();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf("\n\n");

      for (const line of rawEvent.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "" || payload === "[DONE]") continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const choice = (
          parsed as {
            choices?: {
              delta?: { content?: string | null; tool_calls?: DeltaToolCall[] };
            }[];
          }
        ).choices?.[0];
        if (!choice?.delta) continue;

        if (typeof choice.delta.content === "string" && choice.delta.content.length > 0) {
          yield { type: "text", value: choice.delta.content };
        }

        for (const [position, call] of (choice.delta.tool_calls ?? []).entries()) {
          const index = call.index ?? position;
          const existing = pending.get(index) ?? { id: "", name: "", arguments: "" };
          pending.set(index, {
            id: call.id ?? existing.id,
            name: call.function?.name ?? existing.name,
            arguments: existing.arguments + (call.function?.arguments ?? ""),
          });
        }
      }
    }
  }

  if (pending.size > 0) {
    const calls: ToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, call]) => ({
        id: call.id || `call_${index}`,
        type: "function" as const,
        function: { name: call.name, arguments: call.arguments || "{}" },
      }))
      .filter((call) => call.function.name.length > 0);
    if (calls.length > 0) {
      yield { type: "tool_calls", calls };
      return;
    }
  }

  yield { type: "done" };
}
