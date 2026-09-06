"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { describeAction, fitToBudget } from "@/lib/budget";
import type { FlowerLite } from "@/lib/flowers";
import { formatEuro, type BouquetOptions } from "@/lib/pricing";
import { useBouquetStore } from "@/lib/store/bouquet-store";

/**
 * Curseur budget inversé. Rien n'est appliqué sans l'accord du client :
 * l'outil montre ses arbitrages, puis attend qu'on les valide.
 */
export function BudgetAssistant({
  catalog,
  options,
  currentTotal,
}: {
  catalog: FlowerLite[];
  options: BouquetOptions;
  currentTotal: number;
}) {
  const items = useBouquetStore((state) => state.items);
  const replaceItems = useBouquetStore((state) => state.replace);
  // Sélecteurs unitaires : un sélecteur qui construirait un objet
  // provoquerait un rendu à chaque notification du store.
  const seed = useBouquetStore((store) => store.seed);
  const size = useBouquetStore((store) => store.size);
  const wrapping = useBouquetStore((store) => store.wrapping);
  const delivery = useBouquetStore((store) => store.delivery);
  const style = useBouquetStore((store) => store.style);
  const handwrittenCard = useBouquetStore((store) => store.handwrittenCard);
  const customRibbon = useBouquetStore((store) => store.customRibbon);

  const [budget, setBudget] = useState<number>(() =>
    Math.max(25, Math.round(currentTotal || 45)),
  );

  const plan = useMemo(
    () => fitToBudget(items, catalog, options, budget),
    [items, catalog, options, budget],
  );

  const empty = Object.keys(items).length === 0;
  const withinBudget = currentTotal <= budget;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-heading text-lg">
        <Wallet className="size-4 text-poppy" aria-hidden />
        Ajuster au budget
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Fixez une enveloppe : nous proposons les substitutions les plus proches
        avant de toucher aux quantités.
      </p>

      <div className="mt-5">
        <Label
          htmlFor="budget"
          className="flex items-baseline justify-between text-sm"
        >
          <span>Budget visé</span>
          <span className="font-heading text-xl">{formatEuro(budget)}</span>
        </Label>
        <Slider
          id="budget"
          className="mt-3"
          min={15}
          max={300}
          step={5}
          value={[budget]}
          onValueChange={(value) =>
            setBudget(Array.isArray(value) ? (value[0] ?? 15) : value)
          }
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Composition actuelle : {formatEuro(currentTotal)}
        </p>
      </div>

      {empty ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Ajoutez d&apos;abord quelques fleurs, nous nous chargerons du reste.
        </p>
      ) : withinBudget ? (
        <p className="mt-4 rounded-lg bg-leaf/10 px-3 py-2.5 text-sm">
          Vous êtes dans l&apos;enveloppe. Il vous reste{" "}
          {formatEuro(budget - currentTotal)} si vous souhaitez enrichir la
          composition.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Pour tenir {formatEuro(budget)}, voici ce que nous ferions
            {plan.exhausted ? " — sans y parvenir complètement" : ""} :
          </p>
          <ol className="space-y-1.5 text-sm">
            {plan.actions.map((action, index) => (
              <li key={`${action.kind}-${index}`} className="flex gap-2">
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-poppy"
                  aria-hidden
                />
                <span>{describeAction(action)}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Nouveau total estimé : {formatEuro(plan.total)}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              replaceItems({
                seed,
                size,
                wrapping,
                delivery,
                style,
                handwrittenCard,
                customRibbon,
                items: plan.items,
              });
              toast.success("Composition ajustée", {
                description: `${plan.actions.length} arbitrage${plan.actions.length > 1 ? "s" : ""} appliqué${plan.actions.length > 1 ? "s" : ""}.`,
              });
            }}
          >
            Appliquer ces arbitrages
          </Button>
        </div>
      )}
    </section>
  );
}
