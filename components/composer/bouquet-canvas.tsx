"use client";

import { forwardRef } from "react";

import { FlowerShapes } from "@/components/flower-svg/flower-svg";
import { buildFlowerArt } from "@/lib/flower-art";
import { CANVAS, layoutBouquet, stemPath, type BouquetEntry } from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";

/**
 * Rendu du bouquet, en couches : emballage, tiges, puis les têtes du fond
 * vers l'avant. Chaque tige garde une clé stable, ce qui laisse le navigateur
 * animer les déplacements plutôt que de tout redessiner.
 */

function Wrap({ wrapping }: { wrapping: Wrapping }) {
  if (wrapping === "vase inclus") {
    return (
      <g aria-hidden>
        <path
          d="M168 358 L164 452 Q210 466 256 452 L252 358 Z"
          fill="#DCE4E6"
          opacity="0.75"
        />
        <path d="M168 358 L252 358 L250 372 L170 372 Z" fill="#C9D4D7" opacity="0.8" />
        <path d="M180 380 L186 444 Q210 452 234 444 L240 380 Z" fill="#EAF0F1" opacity="0.55" />
      </g>
    );
  }

  if (wrapping === "boîte chapeau") {
    return (
      <g aria-hidden>
        <rect x="140" y="344" width="140" height="112" rx="10" fill="#C9B492" />
        <rect x="140" y="344" width="140" height="20" rx="8" fill="#B7A07C" />
        <rect x="196" y="364" width="28" height="92" fill="#A98F68" opacity="0.4" />
      </g>
    );
  }

  const paper = wrapping === "papier de soie" ? "#F0E4E1" : "#D8C2A0";
  const paperShade = wrapping === "papier de soie" ? "#E3D2CE" : "#C3A985";

  return (
    <g aria-hidden>
      <path d={`M${CANVAS.bindX} 352 L128 462 L292 462 Z`} fill={paper} />
      <path d={`M${CANVAS.bindX} 352 L128 462 L${CANVAS.bindX} 462 Z`} fill={paperShade} opacity="0.55" />
      <path
        d={`M${CANVAS.bindX} 352 L160 448`}
        stroke={paperShade}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      <path
        d={`M${CANVAS.bindX} 352 L262 448`}
        stroke={paperShade}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
    </g>
  );
}

function Ribbon() {
  return (
    <g aria-hidden>
      <path d="M176 366 Q210 380 244 366 L244 380 Q210 394 176 380 Z" fill="#C97B63" />
      <path d="M206 380 L192 412 L206 404 L220 412 Z" fill="#B96C54" />
    </g>
  );
}

type Props = {
  entries: readonly BouquetEntry[];
  seed: number;
  wrapping: Wrapping;
  className?: string;
  /** Désactive les transitions quand le bouquet est un aperçu figé. */
  animated?: boolean;
};

export const BouquetCanvas = forwardRef<SVGSVGElement, Props>(function BouquetCanvas(
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
      <Wrap wrapping={wrapping} />

      <g aria-hidden>
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
      </g>

      {wrapping !== "vase inclus" && !empty ? <Ribbon /> : null}

      <g aria-hidden>
        {layout.stems.map((stem) => {
          const art = buildFlowerArt(stem.flower, false);
          return (
            <g
              key={stem.key}
              transform={`translate(${stem.x.toFixed(1)} ${stem.y.toFixed(1)}) rotate(${stem.rotate.toFixed(1)}) scale(${stem.scale.toFixed(3)}) translate(-50 -46)`}
              style={
                animated
                  ? { transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" }
                  : undefined
              }
            >
              <FlowerShapes shapes={art.shapes} />
            </g>
          );
        })}
      </g>

      {empty ? (
        <text
          x={CANVAS.width / 2}
          y={CANVAS.headY}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="15"
          fontFamily="var(--font-sans, system-ui)"
        >
          Choisissez une première fleur
        </text>
      ) : null}
    </svg>
  );
});

/** Export PNG : on sérialise le SVG puis on le rastérise dans un canvas. */
export async function exportBouquetPng(svg: SVGSVGElement, filename: string): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", String(CANVAS.width));
  background.setAttribute("height", String(CANVAS.height));
  background.setAttribute("fill", "#FAF7F2");
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
    context.fillStyle = "#FAF7F2";
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
