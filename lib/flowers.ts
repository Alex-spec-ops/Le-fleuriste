import flowersJson from "@/data/flowers.json";
import {
  CATEGORIES,
  type AllergenRisk,
  type Category,
  type Color,
  type Occasion,
  type Role,
  type Season,
} from "@/lib/constants";
import type { Flower } from "@/lib/schemas/flower";

/**
 * Couche d'accès au catalogue.
 *
 * Le catalogue vit aujourd'hui dans un JSON versionné, produit par
 * `npm run catalog:build`. Tout le reste de l'application passe par ce module :
 * migrer vers une base de données revient à réimplémenter ces fonctions, sans
 * toucher aux features.
 */

const FLOWERS = flowersJson as Flower[];

const BY_ID = new Map<string, Flower>(FLOWERS.map((flower) => [flower.id, flower]));

export function getAllFlowers(): readonly Flower[] {
  return FLOWERS;
}

export function getFlowerById(id: string): Flower | undefined {
  return BY_ID.get(id);
}

export function getFlowersByIds(ids: readonly string[]): Flower[] {
  return ids.map((id) => BY_ID.get(id)).filter((flower): flower is Flower => flower !== undefined);
}

export type CategorySummary = { category: Category; count: number };

/** Catégories réellement pourvues, dans l'ordre canonique. */
export function getCategorySummaries(): CategorySummary[] {
  const counts = new Map<Category, number>();
  for (const flower of FLOWERS) {
    counts.set(flower.category, (counts.get(flower.category) ?? 0) + 1);
  }
  return CATEGORIES.map((category) => ({ category, count: counts.get(category) ?? 0 })).filter(
    (summary) => summary.count > 0,
  );
}

export type FlowerQuery = {
  search?: string;
  categories?: readonly Category[];
  colors?: readonly Color[];
  seasons?: readonly Season[];
  occasions?: readonly Occasion[];
  roles?: readonly Role[];
  maxPricePerStem?: number;
  minPricePerStem?: number;
  minVaseLifeDays?: number;
  maxAllergenRisk?: AllergenRisk;
  petSafe?: boolean;
  fragrantOnly?: boolean;
};

const ALLERGEN_ORDER: Record<AllergenRisk, number> = { faible: 0, moyen: 1, élevé: 2 };

/** Minuscules sans accents, pour une recherche tolérante. */
function normalise(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function searchFlowers(query: FlowerQuery): Flower[] {
  const needle = query.search ? normalise(query.search.trim()) : "";

  return FLOWERS.filter((flower) => {
    if (needle.length > 0) {
      const haystack = `${normalise(flower.nameFr)} ${normalise(flower.nameLatin)} ${normalise(flower.category)}`;
      if (!haystack.includes(needle)) return false;
    }
    if (query.categories?.length && !query.categories.includes(flower.category)) return false;
    if (query.colors?.length && !flower.colors.some((color) => query.colors?.includes(color))) {
      return false;
    }
    if (
      query.seasons?.length &&
      !flower.season.includes("toute l'année") &&
      !flower.season.some((season) => query.seasons?.includes(season))
    ) {
      return false;
    }
    if (
      query.occasions?.length &&
      !flower.occasions.some((occasion) => query.occasions?.includes(occasion))
    ) {
      return false;
    }
    if (query.roles?.length && !query.roles.includes(flower.role)) return false;
    if (query.maxPricePerStem !== undefined && flower.pricePerStem > query.maxPricePerStem) {
      return false;
    }
    if (query.minPricePerStem !== undefined && flower.pricePerStem < query.minPricePerStem) {
      return false;
    }
    if (query.minVaseLifeDays !== undefined && flower.vaseLifeDays[1] < query.minVaseLifeDays) {
      return false;
    }
    if (
      query.maxAllergenRisk !== undefined &&
      ALLERGEN_ORDER[flower.allergenRisk] > ALLERGEN_ORDER[query.maxAllergenRisk]
    ) {
      return false;
    }
    if (query.petSafe === true && flower.toxicPets) return false;
    if (query.fragrantOnly === true && flower.fragrance === "aucune") return false;
    return true;
  });
}

/**
 * Payload allégé envoyé au navigateur pour le composeur et le catalogue :
 * on retire la description, la symbolique et le nom d'image, qui ne servent
 * qu'aux fiches produit rendues côté serveur.
 */
export type FlowerLite = Omit<Flower, "description" | "symbolism" | "imageUrl">;

export function toFlowerLite(flower: Flower): FlowerLite {
  const { description: _description, symbolism: _symbolism, imageUrl: _imageUrl, ...rest } = flower;
  return rest;
}

export function getCatalogForClient(): FlowerLite[] {
  return FLOWERS.map(toFlowerLite);
}

/**
 * Index compact injecté dans le prompt système du conseiller : une ligne par
 * fleur, sans description, pour que le modèle sache ce qui existe sans
 * qu'on lui envoie 280 fiches complètes.
 */
export function getCatalogCsvIndex(): string {
  const header = "id;nom;categorie;couleurs;saison;prix;role;parfum;allergene;toxique_animaux";
  const rows = FLOWERS.map((flower) =>
    [
      flower.id,
      flower.nameFr,
      flower.category,
      flower.colors.join("|"),
      flower.season.join("|"),
      flower.pricePerStem.toFixed(2),
      flower.role,
      flower.fragrance,
      flower.allergenRisk,
      flower.toxicPets ? "oui" : "non",
    ].join(";"),
  );
  return [header, ...rows].join("\n");
}

/** Disponibilité réelle à une date donnée, import compris. */
export function availabilityAt(
  flower: Pick<Flower, "season" | "offSeasonImport">,
  season: Season,
): "en saison" | "import" | "indisponible" {
  if (flower.season.includes("toute l'année") || flower.season.includes(season)) return "en saison";
  return flower.offSeasonImport ? "import" : "indisponible";
}
