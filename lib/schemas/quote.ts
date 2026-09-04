import { z } from "zod";

import { COLORS, EVENT_TYPES, STYLES } from "@/lib/constants";
import { EVENT_PIECES } from "@/lib/pricing";

const PIECE_IDS: readonly string[] = EVENT_PIECES.map((piece) => piece.id);

/**
 * Quantités par pièce florale. Un enregistrement partiel : seules les pièces
 * réellement demandées sont présentes, et toute clé inconnue est rejetée.
 */
const piecesSchema = z
  .record(z.string(), z.number().int().min(0).max(400))
  .superRefine((pieces, ctx) => {
    for (const key of Object.keys(pieces)) {
      if (!PIECE_IDS.includes(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Pièce florale inconnue : ${key}`,
        });
      }
    }
  });

/** Formulaire de devis événementiel, validé côté navigateur et côté serveur. */
export const quoteFormSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  /** Date au format ISO court, aaaa-mm-jj. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date au format jour/mois/année.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Cette date n'existe pas."),
  location: z.string().trim().min(2, "Indiquez au moins la ville.").max(120),
  guests: z.number().int().min(0).max(2000),
  pieces: piecesSchema,
  palette: z.array(z.enum(COLORS)).min(1, "Choisissez au moins une teinte.").max(3),
  style: z.enum(STYLES),
  budget: z.number().min(150).max(30000),
  constraints: z.object({
    allergies: z.boolean(),
    pets: z.boolean(),
    excludedFlowerIds: z.array(z.string()).max(30),
    requiredFlowerIds: z.array(z.string()).max(30),
    notes: z.string().trim().max(600),
  }),
});

export type QuoteForm = z.infer<typeof quoteFormSchema>;

/** Étape finale : coordonnées pour que la boutique puisse répondre. */
export const quoteContactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(80),
  email: z.email("Adresse e-mail invalide."),
  phone: z
    .string()
    .trim()
    .max(24)
    .regex(/^[0-9+ ().-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().max(1200).optional().or(z.literal("")),
});

export type QuoteContact = z.infer<typeof quoteContactSchema>;

/** Charge utile envoyée à /api/devis. */
export const quoteRequestSchema = z.object({
  form: quoteFormSchema,
  contact: quoteContactSchema,
  /** Total recommandé affiché au client, pour recoupement côté boutique. */
  estimatedTotal: z.number().nonnegative(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const EMPTY_QUOTE_FORM: QuoteForm = {
  eventType: "mariage",
  date: "",
  location: "",
  guests: 80,
  pieces: {},
  palette: ["blanc"],
  style: "champêtre",
  budget: 1200,
  constraints: {
    allergies: false,
    pets: false,
    excludedFlowerIds: [],
    requiredFlowerIds: [],
    notes: "",
  },
};
