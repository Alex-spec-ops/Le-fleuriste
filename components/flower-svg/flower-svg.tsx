import { Fragment } from "react";

import {
  ART_VIEWBOX,
  buildFlowerArt,
  type FlowerArtInput,
  type Shape,
} from "@/lib/flower-art";

/** Rend une liste de primitives : utilisable seul dans un <svg> existant. */
export function FlowerShapes({ shapes }: { shapes: readonly Shape[] }) {
  return (
    <Fragment>
      {shapes.map((shape, index) => {
        const key = `${shape.kind}-${index}`;
        switch (shape.kind) {
          case "path":
            return (
              <path
                key={key}
                d={shape.d}
                fill={shape.fill}
                opacity={shape.opacity}
              />
            );
          case "circle":
            return (
              <circle
                key={key}
                cx={shape.cx}
                cy={shape.cy}
                r={shape.r}
                fill={shape.fill}
                opacity={shape.opacity}
              />
            );
          case "ellipse":
            return (
              <ellipse
                key={key}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={shape.fill}
                opacity={shape.opacity}
                transform={
                  shape.rotate === undefined
                    ? undefined
                    : `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`
                }
              />
            );
          case "stroke":
            return (
              <path
                key={key}
                d={shape.d}
                fill="none"
                stroke={shape.stroke}
                strokeWidth={shape.width}
                strokeLinecap="round"
                opacity={shape.opacity}
              />
            );
        }
      })}
    </Fragment>
  );
}

type FlowerSvgProps = {
  flower: FlowerArtInput;
  /** Texte alternatif. Omis, l'illustration est traitée comme décorative. */
  label?: string;
  withStem?: boolean;
  className?: string;
};

/** Illustration complète d'une fleur, tige comprise par défaut. */
export function FlowerSvg({
  flower,
  label,
  withStem = true,
  className,
}: FlowerSvgProps) {
  const art = buildFlowerArt(flower, withStem);
  return (
    <svg
      viewBox={art.viewBox}
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <FlowerShapes shapes={art.shapes} />
    </svg>
  );
}

/** Vignette carrée : la tête seule, cadrée serrée. */
export function FlowerThumb({
  flower,
  label,
  className,
}: {
  flower: FlowerArtInput;
  label?: string;
  className?: string;
}) {
  const art = buildFlowerArt(flower, false);
  return (
    <svg
      viewBox="4 0 92 92"
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <FlowerShapes shapes={art.shapes} />
    </svg>
  );
}

export { ART_VIEWBOX };
