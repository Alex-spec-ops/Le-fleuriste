import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

/**
 * Formulaire de contact. Comme pour les devis, aucun service d'e-mail externe
 * n'est branché : le message est validé, journalisé et écrit dans un fichier
 * local quand c'est possible. Le client garde le lien « ouvrir dans ma
 * messagerie » comme second canal.
 */

const contactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(80),
  email: z.email("Adresse e-mail invalide."),
  phone: z
    .string()
    .trim()
    .max(24)
    .regex(/^[0-9+ ().-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10, "Détaillez un peu votre demande.").max(2000),
});

const JOURNAL_DIR = join(process.cwd(), "data", "messages");

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Message incomplet.",
        details: parsed.error.issues.map((issue) => ({
          champ: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const receivedAt = new Date();
  const record = { receivedAt: receivedAt.toISOString(), ...parsed.data };

  try {
    await mkdir(JOURNAL_DIR, { recursive: true });
    await appendFile(
      join(JOURNAL_DIR, `${receivedAt.toISOString().slice(0, 7)}.jsonl`),
      `${JSON.stringify(record)}\n`,
      "utf8",
    );
  } catch {
    // Hébergement en lecture seule : le message reste dans les journaux.
  }

  console.info(
    `[contact] ${parsed.data.subject} — ${parsed.data.name} <${parsed.data.email}>${parsed.data.phone ? ` — ${parsed.data.phone}` : ""}`,
  );

  return Response.json({ receivedAt: record.receivedAt }, { status: 201 });
}
