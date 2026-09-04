import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Flower2, MessageCircleHeart, Sparkles } from "lucide-react";

import { BouquetPreview } from "@/components/boutique/bouquet-preview";
import { FlowerThumb } from "@/components/flower-svg/flower-svg";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { COMMITMENTS, REVIEWS } from "@/data/avis";
import { SHOP_BOUQUETS } from "@/data/boutique";
import { COLOR_SWATCHES, seasonForDate } from "@/lib/constants";
import { getAllFlowers, getFlowerById } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: `${SHOP.name} — artisan fleuriste à Paris 10ᵉ`,
  description:
    "Bouquets composés à la main, mariages et événements. Composez votre bouquet en ligne, voyez le prix en direct et repartez avec un devis.",
  alternates: { canonical: "/" },
};

const TOOLS = [
  {
    href: "/composer",
    icon: Flower2,
    title: "Composer un bouquet",
    body: "Choisissez vos fleurs, voyez le bouquet se dessiner et le prix suivre à chaque tige.",
  },
  {
    href: "/devis",
    icon: FileText,
    title: "Devis événementiel",
    body: "Mariage, baptême, séminaire : un devis détaillé et chiffré en cinq minutes.",
  },
  {
    href: "/catalogue",
    icon: Sparkles,
    title: "Le catalogue",
    body: "Toutes nos variétés, leur saison réelle, leur tenue en vase et leurs précautions.",
  },
  {
    href: "/boutique",
    icon: MessageCircleHeart,
    title: "La sélection",
    body: "Des bouquets déjà pensés, prêts à commander ou à personnaliser.",
  },
] as const;

export default function HomePage() {
  const season = seasonForDate(new Date());
  const inSeason = getAllFlowers()
    .filter((flower) => flower.season.includes(season) && !flower.offSeasonImport)
    .sort((a, b) => a.pricePerStem - b.pricePerStem)
    .slice(0, 6);

  const hero = SHOP_BOUQUETS[0];
  const heroEntries = hero
    ? Object.entries(hero.items)
        .map(([id, quantity]) => {
          const flower = getFlowerById(id);
          return flower ? { flower, quantity } : null;
        })
        .filter((entry): entry is { flower: NonNullable<ReturnType<typeof getFlowerById>>; quantity: number } =>
          entry !== null,
        )
    : [];

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-8 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-terracotta-strong">
            {SHOP.tagline}
          </p>
          <h1 className="heading-display mt-4 text-5xl sm:text-6xl">
            Des fleurs choisies
            <br />
            pour une personne précise.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Nous composons à la main, avec ce que le marché offre vraiment cette semaine. Et si vous
            ne savez pas par où commencer, dites-nous simplement pour qui c&apos;est.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/composer" />} size="lg">
              Composer votre bouquet <ArrowRight aria-hidden />
            </Button>
            <Button render={<Link href="/devis" />} size="lg" variant="outline">
              Demander un devis
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {getAllFlowers().length} variétés au catalogue · prix affiché avant commande · devis PDF
            immédiat
          </p>
        </div>

        <Reveal className="justify-self-center">
          <div className="rounded-3xl border border-border bg-card p-6">
            <BouquetPreview
              entries={heroEntries}
              wrapping={hero?.wrapping ?? "kraft simple"}
              className="h-[22rem] w-full sm:h-[26rem]"
              label="Illustration d'un bouquet composé à l'atelier"
            />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, index) => (
            <li key={tool.href}>
              <Reveal delayMs={index * 70}>
                <Link
                  href={tool.href}
                  className="card-lift block h-full rounded-xl border border-border bg-card p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <tool.icon className="size-5 text-terracotta-strong" aria-hidden />
                  <h2 className="mt-3 font-heading text-lg">{tool.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {tool.body}
                  </p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-terracotta-strong">
                  En ce moment
                </p>
                <h2 className="heading-display mt-2 text-3xl">La saison est {season}</h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Ces fleurs sont à leur meilleur prix et à leur meilleure tenue en ce moment, sans
                  import.
                </p>
              </div>
              <Button render={<Link href="/catalogue" />} variant="outline" size="sm">
                Voir tout le catalogue
              </Button>
            </div>
          </Reveal>

          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {inSeason.map((flower, index) => (
              <li key={flower.id}>
                <Reveal delayMs={index * 50}>
                  <Link
                    href={`/catalogue/${flower.id}`}
                    className="card-lift block rounded-xl border border-border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className="flex h-24 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${COLOR_SWATCHES[flower.colors[0]].fill} 20%, var(--card))`,
                      }}
                    >
                      <FlowerThumb flower={flower} className="h-20 w-auto" />
                    </span>
                    <span className="mt-2.5 block truncate text-sm">{flower.nameFr}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatEuro(flower.pricePerStem)} / {flower.unit}
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="heading-display text-3xl">Trois bouquets que nous préparons souvent</h2>
            <Button render={<Link href="/boutique" />} variant="outline" size="sm">
              Toute la sélection
            </Button>
          </div>
        </Reveal>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_BOUQUETS.slice(1, 4).map((bouquet, index) => (
            <li key={bouquet.id}>
              <Reveal delayMs={index * 70}>
                <Link
                  href="/boutique"
                  className="card-lift block h-full rounded-xl border border-border bg-card p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <h3 className="font-heading text-xl">{bouquet.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {bouquet.pitch}
                  </p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          {REVIEWS.length > 0 ? (
            <>
              <h2 className="heading-display text-3xl">Ce qu&apos;en disent nos clients</h2>
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {REVIEWS.map((review) => (
                  <li
                    key={`${review.author}-${review.date}`}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <blockquote className="text-sm leading-relaxed">« {review.text} »</blockquote>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {review.author} — {review.occasion}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="heading-display text-3xl">Nos engagements</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Nous ne publions pas d&apos;avis tant que nous n&apos;en avons pas reçu de véritables.
                En attendant, voici ce sur quoi nous nous engageons.
              </p>
              <ul className="mt-8 grid gap-5 sm:grid-cols-3">
                {COMMITMENTS.map((commitment, index) => (
                  <li key={commitment.title}>
                    <Reveal delayMs={index * 70}>
                      <div className="h-full rounded-xl border border-border bg-card p-5">
                        <h3 className="font-heading text-lg">{commitment.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {commitment.body}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <PageHeader
        eyebrow="Un doute ?"
        title="Dites-nous simplement pour qui c'est"
        lead="Le conseiller en bas de l'écran comprend l'occasion avant de proposer quoi que ce soit. Il ne recommande que des fleurs réellement disponibles à l'atelier."
      >
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/contact" />} variant="outline">
            Nous écrire
          </Button>
          <Button render={<a href={`tel:${SHOP.phoneHref}`} />} variant="ghost">
            {SHOP.phoneDisplay}
          </Button>
        </div>
      </PageHeader>
    </>
  );
}
