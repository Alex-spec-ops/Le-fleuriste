import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Cat, Droplets, Ruler, Wind } from "lucide-react";

import { QuantityControl } from "@/components/bouquet/quantity-control";
import { FlowerCard } from "@/components/catalogue/flower-card";
import { FlowerSvg } from "@/components/flower-svg/flower-svg";
import { FlowerJsonLd } from "@/components/site/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COLOR_SWATCHES } from "@/lib/constants";
import { getAllFlowers, getFlowerById, toFlowerLite } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";

export function generateStaticParams(): { id: string }[] {
  return getAllFlowers().map((flower) => ({ id: flower.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const flower = getFlowerById(id);
  if (!flower) return { title: "Fleur introuvable" };

  return {
    title: flower.nameFr,
    description: flower.description,
    alternates: { canonical: `/catalogue/${flower.id}` },
    openGraph: {
      title: `${flower.nameFr} — ${flower.nameLatin}`,
      description: flower.description,
      images: [{ url: flower.imageUrl, width: 200, height: 320, alt: flower.nameFr }],
    },
  };
}

export default async function FlowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flower = getFlowerById(id);
  if (!flower) notFound();

  const swatch = COLOR_SWATCHES[flower.colors[0]];
  const related = getAllFlowers()
    .filter(
      (candidate) =>
        candidate.id !== flower.id &&
        (candidate.category === flower.category ||
          candidate.colors.some((color) => flower.colors.includes(color))),
    )
    .sort(
      (a, b) =>
        Math.abs(a.pricePerStem - flower.pricePerStem) -
        Math.abs(b.pricePerStem - flower.pricePerStem),
    )
    .slice(0, 3);

  const facts = [
    { icon: Droplets, label: "Tenue en vase", value: `${flower.vaseLifeDays[0]} à ${flower.vaseLifeDays[1]} jours` },
    { icon: Ruler, label: "Hauteur de tige", value: `${flower.stemHeightCm[0]} à ${flower.stemHeightCm[1]} cm` },
    { icon: Wind, label: "Parfum", value: flower.fragrance === "aucune" ? "sans parfum" : flower.fragrance },
    { icon: AlertTriangle, label: "Risque allergène", value: flower.allergenRisk },
  ];

  return (
    <>
      <FlowerJsonLd flower={flower} />

      <div className="mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8">
        <Button
          render={<Link href="/catalogue" />}
          variant="ghost"
          size="sm"
          className="-ml-2"
        >
          <ArrowLeft aria-hidden /> Retour au catalogue
        </Button>
      </div>

      <article className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div
          className="flex items-center justify-center rounded-2xl border border-border p-8"
          style={{ backgroundColor: `color-mix(in oklab, ${swatch.fill} 18%, var(--card))` }}
        >
          <FlowerSvg
            flower={flower}
            label={`Illustration de ${flower.nameFr}`}
            className="h-[26rem] w-auto max-w-full"
          />
        </div>

        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-terracotta-strong">
            {flower.category}
          </p>
          <h1 className="heading-display mt-2 text-4xl sm:text-5xl">{flower.nameFr}</h1>
          <p className="mt-1 text-base italic text-muted-foreground">{flower.nameLatin}</p>

          <p className="mt-6 max-w-prose text-lg leading-relaxed">{flower.description}</p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <p className="font-heading text-3xl">
              {formatEuro(flower.pricePerStem)}
              <span className="ml-1 font-sans text-sm text-muted-foreground">
                / {flower.unit}
              </span>
            </p>
            <QuantityControl
              flowerId={flower.id}
              flowerName={flower.nameFr}
              unit={flower.unit}
            />
            <Button render={<Link href="/composer" />} variant="outline">
              Ouvrir le composeur
            </Button>
          </div>

          <dl className="mt-9 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Saison de disponibilité
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {flower.season.map((season) => (
                  <Badge key={season} variant="secondary" className="font-normal">
                    {season}
                  </Badge>
                ))}
                {flower.offSeasonImport ? (
                  <Badge variant="outline" className="font-normal">
                    disponible hors saison à l&apos;import, avec majoration
                  </Badge>
                ) : null}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Couleurs
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {flower.colors.map((color) => (
                  <span
                    key={color}
                    className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
                  >
                    <span
                      aria-hidden
                      className="size-3 rounded-full border"
                      style={{
                        backgroundColor: COLOR_SWATCHES[color].fill,
                        borderColor: COLOR_SWATCHES[color].stroke,
                      }}
                    />
                    {color}
                  </span>
                ))}
              </dd>
            </div>

            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                  <fact.icon className="size-3.5" aria-hidden />
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm">{fact.value}</dd>
              </div>
            ))}

            <div>
              <dt className="flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                <Cat className="size-3.5" aria-hidden />
                Animaux de compagnie
              </dt>
              <dd className="mt-1 text-sm">
                {flower.toxicPets
                  ? "Toxique en cas d'ingestion : à tenir hors de portée des chats et des chiens."
                  : "Sans danger connu pour les chats et les chiens."}
              </dd>
            </div>

            <div>
              <dt className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Rôle dans un bouquet
              </dt>
              <dd className="mt-1 text-sm">{flower.role}</dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Ce qu&apos;elle dit
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {flower.symbolism.map((meaning) => (
                  <Badge key={meaning} variant="outline" className="font-normal">
                    {meaning}
                  </Badge>
                ))}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Occasions
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {flower.occasions.map((occasion) => (
                  <Badge key={occasion} variant="secondary" className="font-normal">
                    {occasion}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <h2 className="heading-display text-2xl">Dans le même esprit</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => (
              <li key={candidate.id}>
                <FlowerCard flower={toFlowerLite(candidate)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
