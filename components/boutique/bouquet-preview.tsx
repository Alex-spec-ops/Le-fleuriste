import { BouquetScene } from "@/components/bouquet/bouquet-scene";
import { CANVAS, layoutBouquet, type BouquetEntry } from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";

/**
 * Aperçu figé d'un bouquet, rendu côté serveur.
 * Même scène que le composeur, sans interactivité : la sélection de la
 * boutique et le composeur montrent donc exactement le même bouquet.
 */
export function BouquetPreview({
  entries,
  wrapping,
  seed = 7,
  className,
  label,
}: {
  entries: readonly BouquetEntry[];
  wrapping: Wrapping;
  seed?: number;
  className?: string;
  label?: string;
}) {
  const layout = layoutBouquet(entries, seed);

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <BouquetScene layout={layout} seed={seed} wrapping={wrapping} />
    </svg>
  );
}
