"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  BOUQUET_SIZES,
  DELIVERY_MODES,
  STYLES,
  WRAPPINGS,
  type BouquetSize,
  type DeliveryMode,
  type Style,
  type Wrapping,
} from "@/lib/constants";
import { DELIVERY_PRICE, FREE_LOCAL_DELIVERY_FROM, WRAPPING_PRICE, formatEuro } from "@/lib/pricing";
import { useBouquetStore } from "@/lib/store/bouquet-store";
import { cn } from "@/lib/utils";

function OptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  hint?: (option: T) => string | null;
}) {
  return (
    <fieldset>
      <legend className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
        {legend}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const selected = option === value;
          const suffix = hint?.(option);
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "border-foreground/40 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {option}
              {suffix ? <span className="ml-1 opacity-70">{suffix}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BouquetOptions() {
  const size = useBouquetStore((state) => state.size);
  const wrapping = useBouquetStore((state) => state.wrapping);
  const delivery = useBouquetStore((state) => state.delivery);
  const style = useBouquetStore((state) => state.style);
  const handwrittenCard = useBouquetStore((state) => state.handwrittenCard);
  const customRibbon = useBouquetStore((state) => state.customRibbon);

  const setSize = useBouquetStore((state) => state.setSize);
  const setWrapping = useBouquetStore((state) => state.setWrapping);
  const setDelivery = useBouquetStore((state) => state.setDelivery);
  const setStyle = useBouquetStore((state) => state.setStyle);
  const setHandwrittenCard = useBouquetStore((state) => state.setHandwrittenCard);
  const setCustomRibbon = useBouquetStore((state) => state.setCustomRibbon);

  return (
    <div className="space-y-6">
      <OptionGroup<BouquetSize>
        legend="Taille"
        options={BOUQUET_SIZES}
        value={size}
        onChange={setSize}
      />
      <OptionGroup<Style>
        legend="Style de montage"
        options={STYLES}
        value={style}
        onChange={setStyle}
      />
      <OptionGroup<Wrapping>
        legend="Emballage"
        options={WRAPPINGS}
        value={wrapping}
        onChange={setWrapping}
        hint={(option) =>
          WRAPPING_PRICE[option] === 0 ? "inclus" : `+ ${formatEuro(WRAPPING_PRICE[option])}`
        }
      />
      <OptionGroup<DeliveryMode>
        legend="Retrait ou livraison"
        options={DELIVERY_MODES}
        value={delivery}
        onChange={setDelivery}
        hint={(option) =>
          DELIVERY_PRICE[option] === 0 ? "gratuit" : `${formatEuro(DELIVERY_PRICE[option])}`
        }
      />
      <p className="-mt-3 text-xs text-muted-foreground">
        Livraison locale offerte dès {formatEuro(FREE_LOCAL_DELIVERY_FROM)} de commande.
      </p>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="carte" className="text-sm font-normal">
            Carte manuscrite
            <span className="ml-2 text-muted-foreground">+ 2,50 €</span>
          </Label>
          <Switch id="carte" checked={handwrittenCard} onCheckedChange={setHandwrittenCard} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ruban" className="text-sm font-normal">
            Ruban personnalisé
            <span className="ml-2 text-muted-foreground">+ 3,50 €</span>
          </Label>
          <Switch id="ruban" checked={customRibbon} onCheckedChange={setCustomRibbon} />
        </div>
      </div>
    </div>
  );
}
