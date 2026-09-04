"use client";

import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  COLOR_SWATCHES,
  COLORS,
  SEASONS,
  type Category,
} from "@/lib/constants";
import { activeFilterCount, toggle, type FilterState } from "@/lib/filter";
import { cn } from "@/lib/utils";

/** Le curseur Base UI renvoie un nombre ou un tableau selon son mode. */
function firstValue(value: number | readonly number[]): number {
  return Array.isArray(value) ? (value[0] ?? 0) : (value as number);
}

type Props = {
  state: FilterState;
  onChange: (next: FilterState) => void;
  categories: { category: Category; count: number }[];
  maxPriceBound: number;
  resultCount: number;
};

export function FlowerFilters({
  state,
  onChange,
  categories,
  maxPriceBound,
  resultCount,
}: Props) {
  const count = activeFilterCount(state);
  const update = (patch: Partial<FilterState>) =>
    onChange({ ...state, ...patch });

  return (
    <div className="space-y-7">
      <div>
        <Label htmlFor="recherche-fleur" className="text-sm">
          Rechercher une fleur
        </Label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="recherche-fleur"
            type="search"
            value={state.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Nom français ou latin…"
            className="pl-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {resultCount} fleur{resultCount > 1 ? "s" : ""} correspondent
        </p>
      </div>

      <fieldset>
        <legend className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
          Couleur
        </legend>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COLORS.map((color) => {
            const selected = state.colors.includes(color);
            const swatch = COLOR_SWATCHES[color];
            return (
              <button
                key={color}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ colors: toggle(state.colors, color) })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "border-foreground/40 bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30",
                )}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full border"
                  style={{
                    backgroundColor: swatch.fill,
                    borderColor: swatch.stroke,
                  }}
                />
                {color}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
          Saison
        </legend>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SEASONS.filter((season) => season !== "toute l'année").map(
            (season) => {
              const selected = state.seasons.includes(season);
              return (
                <button
                  key={season}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update({ seasons: toggle(state.seasons, season) })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected
                      ? "border-foreground/40 bg-secondary"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {season}
                </button>
              );
            },
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
          Catégorie
        </legend>
        <ul className="mt-3 space-y-1.5">
          {categories.map(({ category, count: categoryCount }) => {
            const id = `cat-${category.replace(/[^a-zA-Z]+/g, "-").toLowerCase()}`;
            return (
              <li key={category} className="flex items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={state.categories.includes(category)}
                  onCheckedChange={() =>
                    update({ categories: toggle(state.categories, category) })
                  }
                />
                <Label
                  htmlFor={id}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {category}
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {categoryCount}
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <Label htmlFor="prix-max" className="text-sm">
          Prix maximum à l&apos;unité
          <span className="ml-2 text-muted-foreground">
            {state.maxPrice === null
              ? "sans limite"
              : `${state.maxPrice.toFixed(2)} €`}
          </span>
        </Label>
        <Slider
          id="prix-max"
          className="mt-3"
          min={1}
          max={Math.ceil(maxPriceBound)}
          step={0.5}
          value={[state.maxPrice ?? Math.ceil(maxPriceBound)]}
          onValueChange={(value) => {
            const next = firstValue(value);
            update({
              maxPrice: next >= Math.ceil(maxPriceBound) ? null : next,
            });
          }}
        />
      </div>

      <div>
        <Label htmlFor="tenue-min" className="text-sm">
          Tenue en vase minimale
          <span className="ml-2 text-muted-foreground">
            {state.minVaseLifeDays === null
              ? "peu importe"
              : `${state.minVaseLifeDays} jours`}
          </span>
        </Label>
        <Slider
          id="tenue-min"
          className="mt-3"
          min={0}
          max={21}
          step={1}
          value={[state.minVaseLifeDays ?? 0]}
          onValueChange={(value) => {
            const next = firstValue(value);
            update({ minVaseLifeDays: next === 0 ? null : next });
          }}
        />
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
          Précautions
        </legend>
        <div className="mt-3 flex items-center gap-2.5">
          <Checkbox
            id="pet-safe"
            checked={state.petSafe}
            onCheckedChange={(value) => update({ petSafe: value === true })}
          />
          <Label
            htmlFor="pet-safe"
            className="cursor-pointer text-sm font-normal"
          >
            Sans risque pour les animaux
          </Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="low-allergen"
            checked={state.lowAllergen}
            onCheckedChange={(value) => update({ lowAllergen: value === true })}
          />
          <Label
            htmlFor="low-allergen"
            className="cursor-pointer text-sm font-normal"
          >
            Faible risque allergène
          </Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="fragrant"
            checked={state.fragrantOnly}
            onCheckedChange={(value) =>
              update({ fragrantOnly: value === true })
            }
          />
          <Label
            htmlFor="fragrant"
            className="cursor-pointer text-sm font-normal"
          >
            Fleurs parfumées uniquement
          </Label>
        </div>
      </fieldset>

      {count > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
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
            })
          }
        >
          <X aria-hidden /> Effacer les filtres
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        </Button>
      ) : null}
    </div>
  );
}
