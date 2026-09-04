import { z } from "zod";

import {
  ALLERGEN_RISKS,
  CATEGORIES,
  COLORS,
  FRAGRANCES,
  OCCASIONS,
  ROLES,
  SEASONS,
  UNITS,
} from "@/lib/constants";

/**
 * Nomenclature botanique : genre capitalisé, épithète spécifique en minuscules,
 * hybride noté « × », rang infraspécifique explicite, cultivar entre guillemets
 * simples, groupe horticole suffixé « Group ». Exemples valides :
 *   Rosa 'Avalanche'
 *   Paeonia lactiflora 'Sarah Bernhardt'
 *   Hydrangea macrophylla subsp. serrata 'Bluebird'
 *   Rosa ×hybrida
 *   Tulipa gesneriana Triumph Group
 */
const BOTANICAL_NAME =
  /^[A-Z][a-zë]+(?:\s×?[a-z][a-zë-]+)?(?:\s(?:subsp\.|var\.|f\.)\s×?[a-z][a-zë-]+)?(?:\s[A-ZÀ-Ý][\p{L}\s-]*Group)?(?:\s'[\p{L}\p{N}][\p{L}\p{N}\s'’.·\/-]{0,44}')?$/u;

export function isValidBotanicalName(value: string): boolean {
  return BOTANICAL_NAME.test(value);
}

const slug = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L'identifiant doit être un slug en minuscules.");

const range = (min: number, max: number, label: string) =>
  z
    .tuple([z.number().min(min).max(max), z.number().min(min).max(max)])
    .refine(([low, high]) => low <= high, {
      message: `${label} : la borne basse doit être inférieure ou égale à la borne haute.`,
    });

export const flowerSchema = z
  .object({
    id: slug,
    nameFr: z.string().min(3).max(80),
    nameLatin: z.string().min(4).max(90).refine(isValidBotanicalName, {
      message: "Nomenclature botanique mal formée.",
    }),
    category: z.enum(CATEGORIES),
    colors: z.array(z.enum(COLORS)).min(1).max(6),
    season: z.array(z.enum(SEASONS)).min(1).max(4),
    /** Prix TTC de détail, par unité de vente (voir `unit`). */
    pricePerStem: z.number().positive().max(90),
    unit: z.enum(UNITS),
    vaseLifeDays: range(1, 400, "Tenue en vase"),
    symbolism: z.array(z.string().min(3).max(60)).min(1).max(6),
    occasions: z.array(z.enum(OCCASIONS)).min(1).max(13),
    fragrance: z.enum(FRAGRANCES),
    stemHeightCm: range(3, 250, "Hauteur de tige"),
    role: z.enum(ROLES),
    allergenRisk: z.enum(ALLERGEN_RISKS),
    toxicPets: z.boolean(),
    /**
     * Disponible hors saison par import (serre néerlandaise, Kenya, Équateur).
     * Ajout au cahier des charges : le § 2.2 impose de marquer ces fleurs pour
     * appliquer la majoration hors saison du simulateur.
     */
    offSeasonImport: z.boolean(),
    imageUrl: z.string().min(1),
    description: z.string().min(30).max(300),
  })
  .strict()
  .superRefine((flower, ctx) => {
    if (flower.season.includes("toute l'année") && flower.season.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["season"],
        message: "« toute l'année » ne se combine avec aucune autre saison.",
      });
    }
    if (flower.season.includes("toute l'année") && flower.offSeasonImport) {
      ctx.addIssue({
        code: "custom",
        path: ["offSeasonImport"],
        message: "Une fleur disponible toute l'année n'a pas de statut d'import hors saison.",
      });
    }
    if (new Set(flower.colors).size !== flower.colors.length) {
      ctx.addIssue({ code: "custom", path: ["colors"], message: "Couleurs en double." });
    }
    if (new Set(flower.occasions).size !== flower.occasions.length) {
      ctx.addIssue({ code: "custom", path: ["occasions"], message: "Occasions en double." });
    }
  });

export type Flower = z.infer<typeof flowerSchema>;

export const flowerCatalogSchema = z.array(flowerSchema).superRefine((flowers, ctx) => {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  for (const [index, flower] of flowers.entries()) {
    if (seenIds.has(flower.id)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "id"],
        message: `Identifiant en double : ${flower.id}`,
      });
    }
    seenIds.add(flower.id);

    const nameKey = flower.nameFr.toLocaleLowerCase("fr-FR");
    if (seenNames.has(nameKey)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "nameFr"],
        message: `Nom français en double : ${flower.nameFr}`,
      });
    }
    seenNames.add(nameKey);
  }
});
