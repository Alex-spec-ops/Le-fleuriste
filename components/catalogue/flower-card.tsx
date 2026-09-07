"use client";

import Link from "next/link";
import { Cat, Wind } from "lucide-react";

import { QuantityControl } from "@/components/bouquet/quantity-control";
import { FlowerPhoto } from "@/components/flower-photo/flower-photo";
import { COLOR_SWATCHES, type Season } from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";
import { availabilityOf, formatEuro } from "@/lib/pricing";

/**
 * Carte du catalogue.
 *
 * La saison est reçue en propriété plutôt que calculée ici : la déduire de
 * `new Date()` dans un composant rendu des deux côtés ferait diverger le
 * serveur et le navigateur au passage de minuit.
 */
export function FlowerCard({ flower, season }: { flower: FlowerLite; season: Season }) {
  const swatch = COLOR_SWATCHES[flower.colors[0]];
  const availability = availabilityOf(flower, season);
  const yearRound = flower.season.includes("toute l'année");

  const badge =
    availability === "en saison"
      ? { label: "De saison", className: "bg-leaf text-white" }
      : availability === "import"
        ? { label: "Import", className: "bg-pollen text-[#241a12]" }
        : { label: "Hors saison", className: "bg-sand text-muted-foreground" };

  return (
    <article className="card-lift card-petal flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        href={`/catalogue/${flower.id}`}
        className="relative block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div
          className="relative h-52 overflow-hidden"
          style={{ backgroundColor: `color-mix(in oklab, ${swatch.fill} 22%, var(--card))` }}
        >
          <FlowerPhoto
            flower={flower}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw"
            className="transition-transform duration-500 hover:scale-[1.04]"
          />
        </div>
        <span
          className={`chip absolute left-3 top-3 text-[0.62rem] uppercase tracking-[0.05em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          {/* Nom en Karla gras : la serif est réservée au nom botanique, comme
              dans la maquette. La règle de base met les titres en serif. */}
          <h3 className="font-sans text-[1.02rem] font-bold leading-tight">
            <Link
              href={`/catalogue/${flower.id}`}
              className="hover:text-poppy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {flower.nameFr}
            </Link>
          </h3>
          <p className="mt-0.5 font-heading text-[0.88rem] italic text-muted-soft">
            {flower.nameLatin}
          </p>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[1.2rem] font-bold text-poppy">
            {formatEuro(flower.pricePerStem)}
          </span>
          <span className="text-xs text-muted-soft">la {flower.unit}</span>
        </div>

        <p className="text-[0.78rem] text-muted-foreground">
          Tient {flower.vaseLifeDays[0]} – {flower.vaseLifeDays[1]} jours ·{" "}
          {yearRound ? "toute l'année" : flower.season.join(", ")}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {flower.fragrance !== "aucune" ? (
            <span className="chip bg-magenta-tint text-[0.68rem] font-semibold text-[#c41570]">
              <Wind className="size-3" aria-hidden /> Parfum {flower.fragrance}
            </span>
          ) : null}
          {flower.toxicPets ? (
            <span className="chip bg-secondary text-[0.68rem] font-semibold text-muted-foreground">
              <Cat className="size-3" aria-hidden /> Toxique animaux
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-end pt-1">
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
