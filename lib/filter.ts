import type { Category, Color, Role, Season } from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";

/**
 * Filtrage côté navigateur, partagé par le catalogue et le composeur, pour
 * qu'une même recherche donne les mêmes résultats aux deux endroits.
 */

export type FilterState = {
  search: string;
  categories: Category[];
  colors: Color[];
  seasons: Season[];
  roles: Role[];
  maxPrice: number | null;
  minVaseLifeDays: number | null;
  petSafe: boolean;
  lowAllergen: boolean;
  fragrantOnly: boolean;
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  categories: [],
  colors: [],
  seasons: [],
  roles: [],
  maxPrice: null,
  minVaseLifeDays: null,
  petSafe: false,
  lowAllergen: false,
  fragrantOnly: false,
};

function normalise(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function filterFlowers<T extends FlowerLite>(
  flowers: readonly T[],
  state: FilterState,
): T[] {
  const needle = normalise(state.search.trim());

  return flowers.filter((flower) => {
    if (needle.length > 0) {
      const haystack = normalise(`${flower.nameFr} ${flower.nameLatin} ${flower.category}`);
      if (!haystack.includes(needle)) return false;
    }
    if (state.categories.length > 0 && !state.categories.includes(flower.category)) return false;
    if (state.colors.length > 0 && !flower.colors.some((color) => state.colors.includes(color))) {
      return false;
    }
    if (
      state.seasons.length > 0 &&
      !flower.season.includes("toute l'année") &&
      !flower.season.some((season) => state.seasons.includes(season))
    ) {
      return false;
    }
    if (state.roles.length > 0 && !state.roles.includes(flower.role)) return false;
    if (state.maxPrice !== null && flower.pricePerStem > state.maxPrice) return false;
    if (state.minVaseLifeDays !== null && flower.vaseLifeDays[1] < state.minVaseLifeDays) {
      return false;
    }
    if (state.petSafe && flower.toxicPets) return false;
    if (state.lowAllergen && flower.allergenRisk !== "faible") return false;
    if (state.fragrantOnly && flower.fragrance === "aucune") return false;
    return true;
  });
}

export function activeFilterCount(state: FilterState): number {
  return (
    (state.search.trim() ? 1 : 0) +
    state.categories.length +
    state.colors.length +
    state.seasons.length +
    state.roles.length +
    (state.maxPrice !== null ? 1 : 0) +
    (state.minVaseLifeDays !== null ? 1 : 0) +
    (state.petSafe ? 1 : 0) +
    (state.lowAllergen ? 1 : 0) +
    (state.fragrantOnly ? 1 : 0)
  );
}

export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
