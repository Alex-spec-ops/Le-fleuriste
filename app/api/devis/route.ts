import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { buildQuoteReference } from "@/lib/quote-pdf";
import { quoteRequestSchema } from "@/lib/schemas/quote";

/**
 * Réception d'une demande de devis.
 *
 * Aucun service d'e-mail externe n'est branché (choix de la boutique) : la
 * demande est validée, horodatée, écrite dans un journal local lorsque le
 * système de fichiers est accessible en écriture, et systématiquement tracée
 * dans les journaux du serveur. Le client garde en parallèle son PDF et un
 * lien « ouvrir dans ma messagerie ».
 */

const JOURNAL_DIR = join(process.cwd(), "data", "demandes");

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Demande incomplète.",
        details: parsed.error.issues.map((issue) => ({
          champ: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const receivedAt = new Date();
  const reference = buildQuoteReference(parsed.data.form, receivedAt);
  const record = { reference, receivedAt: receivedAt.toISOString(), ...parsed.data };

  try {
    await mkdir(JOURNAL_DIR, { recursive: true });
    await appendFile(
      join(JOURNAL_DIR, `${receivedAt.toISOString().slice(0, 7)}.jsonl`),
      `${JSON.stringify(record)}\n`,
      "utf8",
    );
  } catch {
    // Système de fichiers en lecture seule (hébergement serverless) :
    // la demande reste tracée dans les journaux ci-dessous.
  }

  console.info(
    `[devis] ${reference} — ${parsed.data.form.eventType} le ${parsed.data.form.date} à ${parsed.data.form.location} — ${parsed.data.estimatedTotal.toFixed(2)} € — ${parsed.data.contact.name} <${parsed.data.contact.email}>`,
  );

  return Response.json({ reference, receivedAt: record.receivedAt }, { status: 201 });
}
