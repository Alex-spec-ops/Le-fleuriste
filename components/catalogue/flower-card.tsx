"use client";

import Link from "next/link";
import { Cat, Flower2, Wind } from "lucide-react";

import { QuantityControl } from "@/components/bouquet/quantity-control";
import { FlowerThumb } from "@/components/flower-svg/flower-svg";
import { Badge } from "@/components/ui/badge";
import { COLOR_SWATCHES } from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";

export function FlowerCard({ flower }: { flower: FlowerLite }) {
  const swatch = COLOR_SWATCHES[flower.colors[0]];
  const yearRound = flower.season.includes("toute l'année");

  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        href={`/catalogue/${flower.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div
          className="flex aspect-4/3 items-center justify-center px-6 py-4"
          style={{ backgroundColor: `color-mix(in oklab, ${swatch.fill} 16%, var(--card))` }}
        >
          <FlowerThumb flower={flower} className="h-full w-auto max-h-40" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-heading text-lg leading-tight">
            <Link
              href={`/catalogue/${flower.id}`}
              className="hover:text-terracotta-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {flower.nameFr}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs italic text-muted-foreground">{flower.nameLatin}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-normal">
            {yearRound ? "Toute l'année" : flower.season.join(", ")}
          </Badge>
          {flower.fragrance !== "aucune" ? (
            <Badge variant="outline" className="font-normal">
              <Wind className="size-3" aria-hidden /> Parfum {flower.fragrance}
            </Badge>
          ) : null}
          {flower.toxicPets ? (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              <Cat className="size-3" aria-hidden /> Toxique animaux
            </Badge>
          ) : null}
          {flower.role === "feuillage" || flower.role === "remplissage" ? (
            <Badge variant="outline" className="font-normal">
              <Flower2 className="size-3" aria-hidden /> {flower.role}
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <p className="text-sm">
            <span className="font-medium">{formatEuro(flower.pricePerStem)}</span>
            <span className="text-muted-foreground"> / {flower.unit}</span>
          </p>
          <QuantityControl
            flowerId={flower.id}
            flowerName={flower.nameFr}
            unit={flower.unit}
            compact
          />
        </div>
      </div>
    </article>
  );
}
