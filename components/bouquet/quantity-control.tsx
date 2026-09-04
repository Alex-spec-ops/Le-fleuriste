"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBouquetStore } from "@/lib/store/bouquet-store";

/**
 * Ajout et retrait d'une fleur dans le bouquet en cours.
 * Tant que la fleur n'y est pas, un seul bouton ; ensuite, un compteur.
 */
export function QuantityControl({
  flowerId,
  flowerName,
  unit,
  compact = false,
}: {
  flowerId: string;
  flowerName: string;
  unit: string;
  compact?: boolean;
}) {
  const quantity = useBouquetStore((state) => state.items[flowerId] ?? 0);
  const add = useBouquetStore((state) => state.add);
  const remove = useBouquetStore((state) => state.remove);

  if (quantity === 0) {
    return (
      <Button
        type="button"
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        onClick={() => add(flowerId)}
      >
        Ajouter
        <span className="sr-only"> {flowerName} au bouquet</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 rounded-full"
        onClick={() => remove(flowerId)}
        aria-label={`Retirer une ${unit} de ${flowerName}`}
      >
        <Minus className="size-3.5" aria-hidden />
      </Button>
      <span
        className="min-w-6 text-center text-sm tabular-nums"
        aria-live="polite"
        aria-label={`${quantity} ${unit}${quantity > 1 ? "s" : ""} de ${flowerName} dans le bouquet`}
      >
        {quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 rounded-full"
        onClick={() => add(flowerId)}
        aria-label={`Ajouter une ${unit} de ${flowerName}`}
      >
        <Plus className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
