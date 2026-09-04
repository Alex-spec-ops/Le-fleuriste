import { FlowerShapes } from "@/components/flower-svg/flower-svg";
import { CANVAS, layoutBouquet, stemPath, type BouquetEntry } from "@/lib/bouquet-layout";
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
  const paper = wrapping === "papier de soie" ? "#F0E4E1" : "#D8C2A0";

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {wrapping === "vase inclus" ? (
        <path d="M168 358 L164 452 Q210 466 256 452 L252 358 Z" fill="#DCE4E6" opacity="0.75" />
      ) : (
        <path d={`M${CANVAS.bindX} 352 L128 462 L292 462 Z`} fill={paper} />
      )}

      {layout.stems.map((stem) => (
        <path
          key={`tige-${stem.key}`}
          d={stemPath(stem)}
          fill="none"
          stroke="#6E8464"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}

      {layout.stems.map((stem) => {
        const art = buildFlowerArt(stem.flower, false);
        return (
          <g
            key={stem.key}
            transform={`translate(${stem.x.toFixed(1)} ${stem.y.toFixed(1)}) rotate(${stem.rotate.toFixed(1)}) scale(${stem.scale.toFixed(3)}) translate(-50 -46)`}
          >
            <FlowerShapes shapes={art.shapes} />
          </g>
        );
      })}
    </svg>
  );
}
