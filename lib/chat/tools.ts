import { z } from "zod";

import { COLORS, OCCASIONS, ROLES, SEASONS, seasonForDate } from "@/lib/constants";
import { getFlowerById, searchFlowers, type FlowerLite } from "@/lib/flowers";
import { getAllFlowers } from "@/lib/flowers";
import { priceBouquet, formatEuro, type BouquetOptions } from "@/lib/pricing";

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
  limit: z.number().int().min(1).max(20).optional(),
});

const detailsArgs = z.object({ id: z.string().min(2) });

const suggestionArgs = z.object({
  occasion: z.enum(OCCASIONS),
  budget: z.number().min(10).max(600),
  palette: z.array(z.enum(COLORS)).max(3).optional(),
  petSafe: z.boolean().optional(),
  excludeAllergens: z.boolean().optional(),
});

/** Déclarations envoyées à l'API, au format OpenAI/Mistral. */
export const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "searchFlowers",
      description:
        "Cherche des fleurs réellement présentes au catalogue de la boutique. À utiliser avant toute recommandation nominative.",
      parameters: {
        type: "object",
        properties: {
          occasion: { type: "string", enum: [...OCCASIONS] },
          colors: { type: "array", items: { type: "string", enum: [...COLORS] }, maxItems: 4 },
          season: { type: "string", enum: [...SEASONS] },
          role: { type: "string", enum: [...ROLES] },
          maxPricePerStem: { type: "number" },
          minVaseLifeDays: { type: "integer" },
          excludeAllergens: { type: "boolean", description: "Écarte les pollens à risque élevé." },
          petSafe: { type: "boolean", description: "Écarte les fleurs toxiques pour les animaux." },
          fragrantOnly: { type: "boolean" },
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
        "Fiche complète d'une fleur : symbolique, saison, tenue en vase, allergènes, toxicité, prix.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buildBouquetSuggestion",
      description:
        "Construit une composition chiffrée tenant dans un budget, à partir du catalogue réel. Renvoie les identifiants et les quantités à proposer au client.",
      parameters: {
        type: "object",
        properties: {
          occasion: { type: "string", enum: [...OCCASIONS] },
          budget: { type: "number", description: "Budget cible en euros TTC." },
          palette: { type: "array", items: { type: "string", enum: [...COLORS] }, maxItems: 3 },
          petSafe: { type: "boolean" },
          excludeAllergens: { type: "boolean" },
        },
        required: ["occasion", "budget"],
        additionalProperties: false,
      },
    },
  },
];

function compact(flower: FlowerLite | ReturnType<typeof getFlowerById>) {
  if (!flower) return null;
  return {
    id: flower.id,
    nom: flower.nameFr,
    latin: flower.nameLatin,
    categorie: flower.category,
    couleurs: flower.colors,
    saison: flower.season,
    prix: flower.pricePerStem,
    unite: flower.unit,
    role: flower.role,
    tenue: flower.vaseLifeDays,
    parfum: flower.fragrance,
    allergene: flower.allergenRisk,
    toxique_animaux: flower.toxicPets,
  };
}

const BOUQUET_OPTIONS: BouquetOptions = {
  size: "moyen",
  wrapping: "kraft simple",
  delivery: "retrait boutique",
  style: "champêtre",
  handwrittenCard: false,
  customRibbon: false,
  season: seasonForDate(new Date()),
};

function buildSuggestion(args: z.infer<typeof suggestionArgs>) {
  const season = seasonForDate(new Date());
  const catalogue = getAllFlowers();

  const eligible = catalogue.filter((flower) => {
    if (flower.unit === "pot") return false;
    if (args.petSafe && flower.toxicPets) return false;
    if (args.excludeAllergens && flower.allergenRisk === "élevé") return false;
    if (!flower.occasions.includes(args.occasion)) return false;
    if (!flower.season.includes("toute l'année") && !flower.season.includes(season)) return false;
    if (args.palette?.length) {
      return flower.colors.some((color) => args.palette?.includes(color));
    }
    return true;
  });

  const pick = (role: string) =>
    eligible
      .filter((flower) => flower.role === role)
      .sort((a, b) => a.pricePerStem - b.pricePerStem || a.id.localeCompare(b.id));

  const focales = pick("focale");
  const secondaires = pick("secondaire");
  const remplissages = [...pick("remplissage"), ...pick("feuillage")];

  const chosen = [focales[0], secondaires[0], remplissages[0]].filter(
    (flower): flower is NonNullable<typeof flower> => flower !== undefined,
  );

  if (chosen.length === 0) {
    return {
      erreur:
        "Aucune fleur du catalogue ne correspond à cette occasion et à cette palette pour la saison en cours.",
    };
  }

  // On part d'une base équilibrée, puis on ajuste à la hausse ou à la baisse.
  const ratios = [0.45, 0.32, 0.23];
  let scale = 1;
  let items: Record<string, number> = {};
  let total = 0;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    items = {};
    chosen.forEach((flower, index) => {
      const quantity = Math.max(1, Math.round((ratios[index] ?? 0.2) * 12 * scale));
      items[flower.id] = quantity;
    });
    total = priceBouquet(
      chosen.map((flower, index) => ({
        flower,
        quantity: items[flower.id] ?? Math.max(1, Math.round((ratios[index] ?? 0.2) * 12 * scale)),
      })),
      BOUQUET_OPTIONS,
    ).total;

    if (Math.abs(total - args.budget) <= args.budget * 0.12) break;
    scale *= total > args.budget ? 0.85 : 1.15;
    if (scale < 0.25 || scale > 4) break;
  }

  return {
    composition: chosen.map((flower) => ({
      id: flower.id,
      nom: flower.nameFr,
      quantite: items[flower.id] ?? 1,
      prix_unitaire: flower.pricePerStem,
      role: flower.role,
    })),
    items,
    total_estime: total,
    total_affiche: formatEuro(total),
    saison: season,
  };
}

export type ToolResult = { ok: true; content: string } | { ok: false; content: string };

/** Exécute un appel d'outil et renvoie un JSON prêt à renvoyer au modèle. */
export function runTool(name: string, rawArguments: string): ToolResult {
  let parsedArguments: unknown;
  try {
    parsedArguments = rawArguments.trim() === "" ? {} : JSON.parse(rawArguments);
  } catch {
    return { ok: false, content: JSON.stringify({ erreur: "Arguments illisibles." }) };
  }

  switch (name) {
    case "searchFlowers": {
      const parsed = searchArgs.safeParse(parsedArguments);
      if (!parsed.success) {
        return { ok: false, content: JSON.stringify({ erreur: "Paramètres invalides." }) };
      }
      const { limit = 8, excludeAllergens, ...rest } = parsed.data;
      const results = searchFlowers({
        occasions: rest.occasion ? [rest.occasion] : undefined,
        colors: rest.colors,
        seasons: rest.season ? [rest.season] : undefined,
        roles: rest.role ? [rest.role] : undefined,
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
        return { ok: false, content: JSON.stringify({ erreur: "Identifiant manquant." }) };
      }
      const flower = getFlowerById(parsed.data.id);
      if (!flower) {
        return {
          ok: false,
          content: JSON.stringify({ erreur: `Aucune fleur nommée ${parsed.data.id} au catalogue.` }),
        };
      }
      return {
        ok: true,
        content: JSON.stringify({
          ...compact(flower),
          symbolique: flower.symbolism,
          occasions: flower.occasions,
          description: flower.description,
          import_hors_saison: flower.offSeasonImport,
        }),
      };
    }

    case "buildBouquetSuggestion": {
      const parsed = suggestionArgs.safeParse(parsedArguments);
      if (!parsed.success) {
        return { ok: false, content: JSON.stringify({ erreur: "Paramètres invalides." }) };
      }
      return { ok: true, content: JSON.stringify(buildSuggestion(parsed.data)) };
    }

    default:
      return { ok: false, content: JSON.stringify({ erreur: `Outil inconnu : ${name}` }) };
  }
}

/** Ne garde que les identifiants réellement présents au catalogue. */
export function keepKnownFlowers(items: Record<string, number>): Record<string, number> {
  const cleaned: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(items)) {
    if (!getFlowerById(id)) continue;
    const rounded = Math.round(Number(quantity));
    if (Number.isFinite(rounded) && rounded > 0) cleaned[id] = Math.min(200, rounded);
  }
  return cleaned;
}
