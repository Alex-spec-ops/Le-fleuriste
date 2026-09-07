"use client";

import { forwardRef } from "react";

import { BouquetScene } from "@/components/bouquet/bouquet-scene";
import { Sprig } from "@/components/ornament/botanical";
import { CANVAS, layoutBouquet, type BouquetEntry } from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";

/**
 * Rendu du bouquet, en couches : vase derrière, tiges, emballage devant,
 * puis les têtes du fond vers l'avant. Chaque tige garde une clé stable, ce qui laisse le navigateur
 * animer les déplacements plutôt que de tout redessiner.
 */

type Props = {
  entries: readonly BouquetEntry[];
  seed: number;
  wrapping: Wrapping;
  className?: string;
  /** Désactive les transitions quand le bouquet est un aperçu figé. */
  animated?: boolean;
};

export const BouquetCanvas = forwardRef<SVGSVGElement, Props>(
  function BouquetCanvas(
    { entries, seed, wrapping, className, animated = true },
    ref,
  ) {
    const layout = layoutBouquet(entries, seed);
    const empty = layout.stems.length === 0;

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        className={className}
        role="img"
        aria-label={
          empty
            ? "Bouquet vide : ajoutez des fleurs depuis la colonne de droite."
            : `Aperçu du bouquet, ${layout.totalStems} tige${layout.totalStems > 1 ? "s" : ""}.`
        }
      >
        <BouquetScene
          layout={layout}
          seed={seed}
          wrapping={wrapping}
          animated={animated}
        />

        {empty ? (
          <>
            {/* Un brin seul plutôt qu'une toile blanche : l'écran vide reste habité. */}
            <g
              transform={`translate(${CANVAS.headX - 62} ${CANVAS.headY - 132}) scale(1.05)`}
              className="text-leaf"
              opacity={0.32}
            >
              <Sprig seed="toile-vide" leafPairs={5} />
            </g>
            <text
              x={CANVAS.width / 2}
              y={CANVAS.headY + 74}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="15"
              fontFamily="var(--font-sans, system-ui)"
            >
              Choisissez une première fleur
            </text>
          </>
        ) : null}
      </svg>
    );
  },
);

/** Export PNG : on sérialise le SVG puis on le rastérise dans un canvas. */
export async function exportBouquetPng(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.setAttribute("width", String(CANVAS.width));
  background.setAttribute("height", String(CANVAS.height));
  background.setAttribute("fill", "#FFF7EC");
  clone.insertBefore(background, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Impossible de rendre l'aperçu."));
      image.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS.width * scale;
    canvas.height = CANVAS.height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible.");
    context.fillStyle = "#FFF7EC";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("Export impossible.");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(pngBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}
