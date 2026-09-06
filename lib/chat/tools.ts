import { z } from "zod";

import { composeBouquet } from "@/lib/chat/compose";
import { COLORS, OCCASIONS, ROLES, SEASONS } from "@/lib/constants";
import { getFlowerById, searchFlowers } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";
import type { Flower } from "@/lib/schemas/flower";

/**
 * Outils exposés au conseiller.
 *
 * Le modèle ne connaît du catalogue qu'un index compact ; dès qu'il doit
 * recommander précisément, il appelle ces fonctions, qui lisent le vrai
 * fichier de données. Une fleur absente du catalogue ne peut donc pas être
 * proposée : elle n'existe nulle part dans les réponses des outils.
 */

const searchArgs = z.object({
  occasion: z.enum(OCCASIONS).optional(),
  colors: z.array(z.enum(COLORS)).max(4).optional(),
  season: z.enum(SEASONS).optional(),
  role: z.enum(ROLES).optional(),
  maxPricePerStem: z.number().positive().max(90).optional(),
  minVaseLifeDays: z.number().int().min(1).max(60).optional(),
  excludeAllergens: z.boolean().optional(),
  petSafe: z.boolean().optional(),
  fragrantOnly: z.boolean().optional(),
  search: z.string().min(2).max(60).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

const detailsArgs = z.object({
  ids: z.array(z.string().min(2)).min(1).max(8),
});

const suggestionArgs = z.object({
  occasion: z.enum(OCCASIONS),
  budget: z.number().min(10).max(600),
  palette: z.array(z.enum(COLORS)).max(3).optional(),
  petSafe: z.boolean().optional(),
  excludeAllergens: z.boolean().optional(),
  fragrantOnly: z.boolean().optional(),
});

/** Déclarations envoyées à l'API, au format OpenAI/Mistral. */
export const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "searchFlowers",
      description:
        "Cherche des fleurs réellement présentes au catalogue de la boutique. À utiliser avant toute recommandation nominative, et pour répondre à toute question sur ce que la boutique propose.",
      parameters: {
        type: "object",
        properties: {
          occasion: { type: "string", enum: [...OCCASIONS] },
          colors: {
            type: "array",
            items: { type: "string", enum: [...COLORS] },
            maxItems: 4,
          },
          season: { type: "string", enum: [...SEASONS] },
          role: { type: "string", enum: [...ROLES] },
          maxPricePerStem: { type: "number" },
          minVaseLifeDays: { type: "integer" },
          excludeAllergens: {
            type: "boolean",
            description: "Écarte les pollens à risque élevé.",
          },
          petSafe: {
            type: "boolean",
            description: "Écarte les fleurs toxiques pour les animaux.",
          },
          fragrantOnly: { type: "boolean" },
          search: {
            type: "string",
            description: "Recherche libre sur le nom français ou latin.",
          },
          limit: { type: "integer", minimum: 1, maximum: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFlowerDetails",
      description:
        "Fiches complètes de une à huit fleurs : symbolique, saison, tenue en vase, hauteur, parfum, allergènes, toxicité pour les animaux, prix et description du fleuriste.",
      parameters: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 8,
            description: "Identifiants du catalogue, colonne id de l'index.",
          },
        },
        required: ["ids"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buildBouquetSuggestion",
      description:
        "Construit une composition chiffrée tenant dans un budget, à partir du catalogue réel et de la saison en cours. Renvoie les identifiants et les quantités à proposer au client.",
      parameters: {
        type: "object",
        properties: {
          occasion: { type: "string", enum: [...OCCASIONS] },
          budget: { type: "number", description: "Budget cible en euros TTC." },
          palette: {
            type: "array",
            items: { type: "string", enum: [...COLORS] },
            maxItems: 3,
          },
          petSafe: { type: "boolean" },
          excludeAllergens: { type: "boolean" },
          fragrantOnly: { type: "boolean" },
        },
        required: ["occasion", "budget"],
        additionalProperties: false,
      },
    },
  },
];

function compact(flower: Flower) {
  return {
    id: flower.id,
    nom: flower.nameFr,
    latin: flower.nameLatin,
    categorie: flower.category,
    couleurs: flower.colors,
    saison: flower.season,
    import_hors_saison: flower.offSeasonImport,
    prix: flower.pricePerStem,
    unite: flower.unit,
    role: flower.role,
    tenue_jours: flower.vaseLifeDays,
    hauteur_cm: flower.stemHeightCm,
    parfum: flower.fragrance,
    allergene: flower.allergenRisk,
    toxique_animaux: flower.toxicPets,
    occasions: flower.occasions,
  };
}

export type ToolResult = { ok: boolean; content: string };

/** Exécute un appel d'outil et renvoie un JSON prêt à renvoyer au modèle. */
export function runTool(name: string, rawArguments: string): ToolResult {
  let parsedArguments: unknown;
  try {
    parsedArguments =
      rawArguments.trim() === "" ? {} : JSON.parse(rawArguments);
  } catch {
    return {
      ok: false,
      content: JSON.stringify({ erreur: "Arguments illisibles." }),
    };
  }

  switch (name) {
    case "searchFlowers": {
      const parsed = searchArgs.safeParse(parsedArguments);
      if (!parsed.success) {
        return {
          ok: false,
          content: JSON.stringify({ erreur: "Paramètres invalides." }),
        };
      }
      const {
        limit = 8,
        excludeAllergens,
        occasion,
        season,
        role,
        ...rest
      } = parsed.data;
      const results = searchFlowers({
        search: rest.search,
        occasions: occasion ? [occasion] : undefined,
        colors: rest.colors,
        seasons: season ? [season] : undefined,
        roles: role ? [role] : undefined,
        maxPricePerStem: rest.maxPricePerStem,
        minVaseLifeDays: rest.minVaseLifeDays,
        petSafe: rest.petSafe,
        fragrantOnly: rest.fragrantOnly,
        maxAllergenRisk: excludeAllergens ? "faible" : undefined,
      });
      return {
        ok: true,
        content: JSON.stringify({
          total: results.length,
          fleurs: results.slice(0, limit).map(compact),
        }),
      };
    }

    case "getFlowerDetails": {
      const parsed = detailsArgs.safeParse(parsedArguments);
      if (!parsed.success) {
        return {
          ok: false,
          content: JSON.stringify({
            erreur: "Fournissez un tableau `ids` d'au moins un élément.",
          }),
        };
      }

      const found = parsed.data.ids
        .map((id) => getFlowerById(id))
        .filter((flower): flower is Flower => flower !== undefined);
      const missing = parsed.data.ids.filter((id) => !getFlowerById(id));

      return {
        ok: found.length > 0,
        content: JSON.stringify({
          fleurs: found.map((flower) => ({
            ...compact(flower),
            symbolique: flower.symbolism,
            description: flower.description,
          })),
          introuvables: missing,
        }),
      };
    }

    case "buildBouquetSuggestion": {
      const parsed = suggestionArgs.safeParse(parsedArguments);
      if (!parsed.success) {
        return {
          ok: false,
          content: JSON.stringify({ erreur: "Paramètres invalides." }),
        };
      }

      const bouquet = composeBouquet(parsed.data);
      if (!bouquet) {
        return {
          ok: false,
          content: JSON.stringify({
            erreur:
              "Aucune fleur du catalogue ne correspond à cette occasion et à ces contraintes pour la saison en cours.",
          }),
        };
      }

      return {
        ok: true,
        content: JSON.stringify({
          composition: bouquet.lines.map((line) => ({
            id: line.flower.id,
            nom: line.flower.nameFr,
            quantite: line.quantity,
            prix_unitaire: line.flower.pricePerStem,
            role: line.flower.role,
          })),
          items: bouquet.items,
          tiges: bouquet.stemCount,
          total_estime: bouquet.total,
          total_affiche: formatEuro(bouquet.total),
        }),
      };
    }

    default:
      return {
        ok: false,
        content: JSON.stringify({ erreur: `Outil inconnu : ${name}` }),
      };
  }
}

/** Ne garde que les identifiants réellement présents au catalogue. */
export function keepKnownFlowers(
  items: Record<string, number>,
): Record<string, number> {
  const cleaned: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(items)) {
    if (!getFlowerById(id)) continue;
    const rounded = Math.round(Number(quantity));
    if (Number.isFinite(rounded) && rounded > 0)
      cleaned[id] = Math.min(200, rounded);
  }
  return cleaned;
}
