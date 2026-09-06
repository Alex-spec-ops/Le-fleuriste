import { WrapBack, WrapFront } from "@/components/bouquet/wrapping";
import { FlowerShapes } from "@/components/flower-svg/flower-svg";
import {
  CANVAS,
  layoutBouquet,
  stemPath,
  type BouquetEntry,
} from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";
import { buildFlowerArt } from "@/lib/flower-art";

/**
 * Aperçu figé d'un bouquet, rendu côté serveur.
 * Même algorithme de disposition que le composeur, sans interactivité :
 * la sélection de la boutique et le composeur montrent donc le même bouquet.
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
      <WrapBack wrapping={wrapping} />


      {layout.stems.map((stem) => (
        <path
          key={`tige-${stem.key}`}
          d={stemPath(stem)}
          fill="none"
          stroke="#2C6B45"
          strokeWidth={1.4 + stem.depth * 0.8}
          strokeLinecap="round"
          opacity={0.5 + stem.depth * 0.4}
        />
      ))}

      {layout.stems.length > 0 ? <WrapFront wrapping={wrapping} /> : null}

      {layout.stems.map((stem) => {
        const art = buildFlowerArt(stem.flower, false, "compact");
        return (
          <g
            key={stem.key}
            transform={`translate(${stem.x.toFixed(1)} ${stem.y.toFixed(1)}) rotate(${stem.rotate.toFixed(1)}) scale(${stem.scale.toFixed(3)}) translate(-50 -46)`}
                opacity={stem.opacity.toFixed(2)}
          >
            <FlowerShapes shapes={art.shapes} />
          </g>
        );
      })}
    </svg>
  );
}
