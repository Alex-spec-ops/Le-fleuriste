"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import { QuantityControl } from "@/components/bouquet/quantity-control";
import { FlowerFilters } from "@/components/catalogue/flower-filters";
import { FlowerThumb } from "@/components/flower-svg/flower-svg";
import { EmptySprig } from "@/components/ornament/botanical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, COLOR_SWATCHES, type Category } from "@/lib/constants";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterFlowers,
  type FilterState,
} from "@/lib/filter";
import type { FlowerLite } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";
import { useBouquetStore } from "@/lib/store/bouquet-store";

/**
 * Colonne de sélection : recherche instantanée, filtres, puis un accordéon
 * par catégorie. L'accordéon s'appuie sur <details>, donc il fonctionne au
 * clavier et sans JavaScript côté navigation.
 */
export function FlowerPicker({
  flowers,
  categories,
}: {
  flowers: FlowerLite[];
  categories: { category: Category; count: number }[];
}) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const items = useBouquetStore((state) => state.items);

  const maxPriceBound = useMemo(
    () =>
      flowers.reduce((max, flower) => Math.max(max, flower.pricePerStem), 0),
    [flowers],
  );

  const results = useMemo(
    () => filterFlowers(flowers, filters),
    [flowers, filters],
  );

  const grouped = useMemo(() => {
    const map = new Map<Category, FlowerLite[]>();
    for (const flower of results) {
      const list = map.get(flower.category);
      if (list) list.push(flower);
      else map.set(flower.category, [flower]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"));
    }
    return CATEGORIES.filter((category) => map.has(category)).map(
      (category) => ({
        category,
        flowers: map.get(category) ?? [],
      }),
    );
  }, [results]);

  const searching =
    filters.search.trim().length > 0 || activeFilterCount(filters) > 0;
  const chosen = Object.keys(items).length;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border pb-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
            placeholder="Chercher une fleur, un cultivar…"
            aria-label="Rechercher une fleur dans le catalogue"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((value) => !value)}
          >
            <SlidersHorizontal aria-hidden /> Filtres
            {activeFilterCount(filters) > 0
              ? ` (${activeFilterCount(filters)})`
              : ""}
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {results.length} fleur{results.length > 1 ? "s" : ""}
            {chosen > 0
              ? ` · ${chosen} variété${chosen > 1 ? "s" : ""} au bouquet`
              : ""}
          </p>
        </div>

        {showFilters ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <FlowerFilters
              state={filters}
              onChange={setFilters}
              categories={categories}
              maxPriceBound={maxPriceBound}
              resultCount={results.length}
            />
          </div>
        ) : null}
      </div>

      <div className="scroll-soft mt-4 flex-1 overflow-y-auto pr-1">
        {grouped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <EmptySprig className="mb-3 h-20 w-20" />
            <p className="text-sm">
              Aucune fleur ne correspond à cette recherche.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Réinitialiser
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {grouped.map(({ category, flowers: list }) => (
              <li key={category}>
                <details
                  open={searching || list.some((flower) => items[flower.id])}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <ChevronDown
                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                      {category}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {list.length}
                    </span>
                  </summary>

                  <ul className="mb-2 mt-1 space-y-1">
                    {list.map((flower) => {
                      const swatch = COLOR_SWATCHES[flower.colors[0]];
                      const quantity = items[flower.id] ?? 0;
                      return (
                        <li
                          key={flower.id}
                          className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-colors ${
                            quantity > 0
                              ? "border-poppy/50 bg-poppy/5"
                              : "border-transparent hover:bg-secondary/50"
                          }`}
                        >
                          <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-md"
                            style={{
                              backgroundColor: `color-mix(in oklab, ${swatch.fill} 22%, var(--card))`,
                            }}
                          >
                            <FlowerThumb flower={flower} className="size-9" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <Link
                              href={`/catalogue/${flower.id}`}
                              className="block truncate text-sm hover:text-poppy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              {flower.nameFr}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {formatEuro(flower.pricePerStem)} / {flower.unit}{" "}
                              ·{" "}
                              {flower.season.includes("toute l'année")
                                ? "toute l'année"
                                : flower.season.join(", ")}
                            </span>
                          </span>

                          <QuantityControl
                            flowerId={flower.id}
                            flowerName={flower.nameFr}
                            unit={flower.unit}
                            compact
                          />
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
