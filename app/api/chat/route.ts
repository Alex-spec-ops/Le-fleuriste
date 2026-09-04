import { z } from "zod";

import { MarkerFilter, SUGGESTIONS_SENTINEL } from "@/lib/chat/marker-filter";
import {
  MistralError,
  streamChatTurn,
  type ChatMessageParam,
  type ToolCall,
} from "@/lib/chat/mistral";
import { buildSystemPrompt, fallbackAnswer } from "@/lib/chat/system-prompt";
import { CHAT_TOOLS, runTool } from "@/lib/chat/tools";

/**
 * Conseiller de boutique.
 *
 * La clé MISTRAL_API_KEY reste sur le serveur. La réponse est relayée en
 * streaming au navigateur ; les blocs de composition sont extraits, validés
 * contre le catalogue, puis renvoyés en fin de flux.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

/* ------------------------------------------------------- limitation de débit */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "inconnu";
  return request.headers.get("x-real-ip") ?? "inconnu";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [candidate, stamps] of hits) {
      if (stamps.every((stamp) => now - stamp >= WINDOW_MS)) hits.delete(candidate);
    }
  }
  return recent.length > MAX_REQUESTS;
}

/* ----------------------------------------------------------------- réponses */

function textStream(body: string, suggestions: unknown[] = []): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.enqueue(
          encoder.encode(SUGGESTIONS_SENTINEL + JSON.stringify(suggestions)),
        );
        controller.close();
      },
    }),
    { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
  );
}

const MAX_TOOL_ROUNDS = 4;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.MISTRAL_API_KEY;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Conversation invalide." }, { status: 422 });
  }

  if (rateLimited(clientKey(request))) {
    return textStream(
      "Vous avez posé beaucoup de questions d'un coup — laissez-nous quelques minutes, ou appelez directement la boutique.",
    );
  }

  if (!apiKey) {
    // Aucune clé configurée : on répond utilement plutôt que d'échouer.
    return textStream(fallbackAnswer());
  }

  const conversation: ChatMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    ...parsed.data.messages.map((message) =>
      message.role === "user"
        ? ({ role: "user", content: message.content } as const)
        : ({ role: "assistant", content: message.content } as const),
    ),
  ];

  const encoder = new TextEncoder();
  const filter = new MarkerFilter();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        if (text.length > 0) controller.enqueue(encoder.encode(text));
      };

      try {
        let produced = false;

        /** Un tour : relaie le texte, et rend les appels d'outils s'il y en a. */
        const runRound = async (): Promise<ToolCall[] | null> => {
          let assistantText = "";
          for await (const event of streamChatTurn(conversation, CHAT_TOOLS, apiKey)) {
            if (event.type === "text") {
              assistantText += event.value;
              produced = true;
              send(filter.push(event.value));
            } else if (event.type === "tool_calls") {
              conversation.push({
                role: "assistant",
                content: assistantText.length > 0 ? assistantText : null,
                tool_calls: event.calls,
              });
              return event.calls;
            }
          }
          return null;
        };

        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
          const toolCalls = await runRound();
          if (!toolCalls) break;

          for (const call of toolCalls) {
            const result = runTool(call.function.name, call.function.arguments);
            conversation.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: result.content,
            });
          }
        }

        send(filter.flush());
        if (!produced) send(fallbackAnswer());

        controller.enqueue(
          encoder.encode(SUGGESTIONS_SENTINEL + JSON.stringify(filter.suggestions())),
        );
      } catch (error) {
        const detail =
          error instanceof MistralError
            ? ` (code ${error.status})`
            : "";
        console.error("[chat] échec du conseiller", error);
        send(filter.flush());
        send(`\n\n${fallbackAnswer()}${detail}`);
        controller.enqueue(
          encoder.encode(SUGGESTIONS_SENTINEL + JSON.stringify(filter.suggestions())),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
