import type {
  AllergenRisk,
  Category,
  Color,
  Fragrance,
  Occasion,
  Role,
  Season,
  Unit,
} from "@/lib/constants";
import type { Flower } from "@/lib/schemas/flower";

/**
 * Forme condensée d'une entrée de catalogue.
 * Les champs constants d'une catégorie (unité, rôle, parfum, allergènes…)
 * sont portés par `CategoryDefaults` et surchargés au cas par cas.
 */
export type Seed = {
  id: string;
  fr: string;
  latin: string;
  colors: Color[];
  season: Season[];
  /** Prix TTC de détail, à l'unité de vente de la catégorie. */
  price: number;
  /** Tenue en vase, en jours [min, max]. */
  vase: [number, number];
  /** Hauteur de tige ou du sujet, en cm [min, max]. */
  height: [number, number];
  sym: string[];
  occ: Occasion[];
  desc: string;
  unit?: Unit;
  role?: Role;
  fragrance?: Fragrance;
  allergen?: AllergenRisk;
  toxic?: boolean;
  /** Disponible hors saison par import (serre néerlandaise, Kenya, Équateur). */
  offSeason?: boolean;
};

export type CategoryDefaults = {
  unit: Unit;
  role: Role;
  fragrance: Fragrance;
  allergenRisk: AllergenRisk;
  toxicPets: boolean;
  offSeason?: boolean;
};

export function buildCategory(
  category: Category,
  defaults: CategoryDefaults,
  seeds: readonly Seed[],
): Flower[] {
  return seeds.map((seed) => {
    const yearRound = seed.season.includes("toute l'année");
    return {
      id: seed.id,
      nameFr: seed.fr,
      nameLatin: seed.latin,
      category,
      colors: seed.colors,
      season: seed.season,
      pricePerStem: seed.price,
      unit: seed.unit ?? defaults.unit,
      vaseLifeDays: seed.vase,
      symbolism: seed.sym,
      occasions: seed.occ,
      fragrance: seed.fragrance ?? defaults.fragrance,
      stemHeightCm: seed.height,
      role: seed.role ?? defaults.role,
      allergenRisk: seed.allergen ?? defaults.allergenRisk,
      toxicPets: seed.toxic ?? defaults.toxicPets,
      offSeasonImport: yearRound ? false : (seed.offSeason ?? defaults.offSeason ?? false),
      imageUrl: `/illustrations/${seed.id}.svg`,
      description: seed.desc,
    } satisfies Flower;
  });
}
