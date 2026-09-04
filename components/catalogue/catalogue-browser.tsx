"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { FlowerCard } from "@/components/catalogue/flower-card";
import { FlowerFilters } from "@/components/catalogue/flower-filters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Category } from "@/lib/constants";
import { EMPTY_FILTERS, filterFlowers, type FilterState } from "@/lib/filter";
import type { FlowerLite } from "@/lib/flowers";

type SortKey = "nom" | "prix-croissant" | "prix-decroissant" | "tenue";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "nom", label: "Ordre alphabétique" },
  { key: "prix-croissant", label: "Prix croissant" },
  { key: "prix-decroissant", label: "Prix décroissant" },
  { key: "tenue", label: "Meilleure tenue en vase" },
];

export function CatalogueBrowser({
  flowers,
  categories,
}: {
  flowers: FlowerLite[];
  categories: { category: Category; count: number }[];
}) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("nom");

  const maxPriceBound = useMemo(
    () => flowers.reduce((max, flower) => Math.max(max, flower.pricePerStem), 0),
    [flowers],
  );

  const results = useMemo(() => {
    const filtered = filterFlowers(flowers, filters);
    const sorted = [...filtered];
    switch (sort) {
      case "prix-croissant":
        sorted.sort((a, b) => a.pricePerStem - b.pricePerStem);
        break;
      case "prix-decroissant":
        sorted.sort((a, b) => b.pricePerStem - a.pricePerStem);
        break;
      case "tenue":
        sorted.sort((a, b) => b.vaseLifeDays[1] - a.vaseLifeDays[1]);
        break;
      default:
        sorted.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"));
    }
    return sorted;
  }, [flowers, filters, sort]);

  const filterPanel = (
    <FlowerFilters
      state={filters}
      onChange={setFilters}
      categories={categories}
      maxPriceBound={maxPriceBound}
      resultCount={results.length}
    />
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scroll-soft">
          {filterPanel}
        </div>
      </aside>

      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Sheet>
            <SheetTrigger
              render={<Button type="button" variant="outline" size="sm" />}
              className="lg:hidden"
            >
              <SlidersHorizontal aria-hidden /> Filtrer
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtrer le catalogue</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">{filterPanel}</div>
            </SheetContent>
          </Sheet>

          <p className="hidden text-sm text-muted-foreground lg:block" aria-live="polite">
            {results.length} fleur{results.length > 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-2">
            <label htmlFor="tri" className="text-sm text-muted-foreground">
              Trier par
            </label>
            <select
              id="tri"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="rounded-md border border-input bg-card px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <p className="font-heading text-xl">Aucune fleur ne correspond</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Essayez d&apos;élargir la fourchette de prix ou de retirer une couleur. Le catalogue
              compte {flowers.length} variétés.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((flower) => (
              <li key={flower.id}>
                <FlowerCard flower={flower} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
