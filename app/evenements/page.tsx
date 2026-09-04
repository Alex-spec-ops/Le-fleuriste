import type { Metadata } from "next";
import Link from "next/link";

import { BouquetPreview } from "@/components/boutique/bouquet-preview";
import { CornerSprig, PetalMark } from "@/components/ornament/botanical";
import { PageHeader, SectionHeading } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import type { Wrapping } from "@/lib/constants";
import { getFlowerById } from "@/lib/flowers";
import { EVENT_PIECES, formatEuro } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Mariages et événements",
  description:
    "Bouquet de mariée, cérémonie, centres de table, arche : nous chiffrons votre décor floral avec une fourchette de prix honnête et un devis PDF immédiat.",
  alternates: { canonical: "/evenements" },
};

const STEPS = [
  {
    title: "Vous chiffrez en ligne",
    body: "Le formulaire de devis vous pose une question par écran et produit une fourchette de prix détaillée, pièce par pièce.",
  },
  {
    title: "Nous en parlons",
    body: "Un échange de vingt minutes suffit à caler la palette, le lieu et les contraintes d'installation.",
  },
  {
    title: "Nous réservons au marché",
    body: "Les fleurs sont commandées à Rungis dix jours avant, ajustées à ce qui sera réellement beau ce jour-là.",
  },
  {
    title: "Nous installons",
    body: "Livraison et mise en place sur site, la veille ou le matin même selon l'accès au lieu.",
  },
];

type GalleryPiece = {
  id: string;
  title: string;
  caption: string;
  wrapping: Wrapping;
  items: Record<string, number>;
};

const GALLERY: GalleryPiece[] = [
  {
    id: "mariage-champetre",
    title: "Mariage champêtre, juin",
    caption:
      "Roses de jardin, renoncules papillon et beaucoup de verdure. Palette pêche et crème.",
    wrapping: "kraft simple",
    items: {
      "rose-peach-avalanche": 9,
      "renoncule-butterfly-charlotte": 6,
      "chrysantheme-country": 6,
      "oeillet-lege-marimo": 4,
    },
  },
  {
    id: "ceremonie-blanche",
    title: "Cérémonie blanc et vert, septembre",
    caption:
      "Hortensia jade, roses Avalanche et santini. Une composition qui tient toute la journée.",
    wrapping: "vase inclus",
    items: {
      "hortensia-magical-jade": 2,
      "rose-avalanche": 8,
      "chrysantheme-shamrock": 4,
      "oeillet-prado-mint": 5,
    },
  },
  {
    id: "table-automne",
    title: "Table d'automne, octobre",
    caption:
      "Dahlias Café au Lait, roses Toffee et chrysanthèmes araignée bronze.",
    wrapping: "papier de soie",
    items: {
      "dahlia-cafe-au-lait": 3,
      "rose-toffee": 5,
      "chrysantheme-anastasia-bronze": 3,
      "dahlia-cornel-bronze": 4,
    },
  },
];

export default function EvenementsPage() {
  return (
    <>
      <PageHeader
        route="/evenements"
        eyebrow="Mariages et événements"
        title="Un décor floral, chiffré avant d'être promis"
        lead="Nous travaillons les mariages, les baptêmes, les séminaires et les cérémonies d'adieu. Vous obtenez un devis détaillé en ligne, puis nous l'affinons ensemble."
      >
        <div className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/devis" />}>
            Chiffrer mon événement
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/contact" />}
            variant="outline"
          >
            Prendre rendez-vous
          </Button>
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Reveal delayMs={index * 70}>
                <div className="card-petal h-full rounded-xl border border-border bg-card p-5">
                  <p className="flex items-baseline gap-2 font-heading text-3xl text-terracotta">
                    {index + 1}
                    <PetalMark className="translate-y-[-2px] opacity-70" />
                  </p>
                  <h2 className="mt-2 font-heading text-lg">{step.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="botanical overflow-hidden border-y border-border bg-secondary/40">
        <CornerSprig corner="top-right" seed="realisations" size={172} />
        <CornerSprig corner="bottom-left" seed="realisations-bas" size={140} />
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <SectionHeading
            eyebrow="Nos réalisations"
            title="Trois réalisations types"
          />
          <p className="mt-2 max-w-xl text-muted-foreground">
            Illustrations produites à partir des compositions réelles : chaque
            fleur dessinée existe au catalogue, avec son prix.
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {GALLERY.map((piece, index) => {
              const entries = Object.entries(piece.items)
                .map(([id, quantity]) => {
                  const flower = getFlowerById(id);
                  return flower ? { flower, quantity } : null;
                })
                .filter(
                  (
                    entry,
                  ): entry is {
                    flower: NonNullable<ReturnType<typeof getFlowerById>>;
                    quantity: number;
                  } => entry !== null,
                );

              return (
                <li key={piece.id}>
                  <Reveal delayMs={index * 80}>
                    <figure className="overflow-hidden rounded-xl border border-border bg-card">
                      <BouquetPreview
                        entries={entries}
                        wrapping={piece.wrapping}
                        seed={index * 13 + 3}
                        className="h-64 w-full"
                        label={piece.title}
                      />
                      <figcaption className="border-t border-border p-4">
                        <p className="font-heading text-lg">{piece.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {piece.caption}
                        </p>
                      </figcaption>
                    </figure>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="heading-display text-3xl">
          Les pièces que nous réalisons
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Les montants ci-dessous sont la main-d&apos;œuvre : le montage, la
          structure et la finition. Le prix des fleurs s&apos;y ajoute, selon la
          palette et la saison retenues.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">
              Main-d&apos;œuvre par pièce florale et volume indicatif
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="py-2 font-normal">
                  Pièce
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Volume indicatif
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Main-d&apos;œuvre
                </th>
              </tr>
            </thead>
            <tbody>
              {EVENT_PIECES.map((piece) => (
                <tr key={piece.id} className="border-b border-border/70">
                  <td className="py-2.5">{piece.label}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {piece.defaultStems} tiges
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatEuro(piece.labour)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Livraison sur le lieu de l&apos;événement et installation sur place
          sont facturées à part. Devis estimatif, non contractuel.
        </p>

        <div className="mt-10">
          <Button
            nativeButton={false}
            render={<Link href="/devis" />}
            size="lg"
          >
            Obtenir mon devis détaillé
          </Button>
        </div>
      </section>
    </>
  );
}
