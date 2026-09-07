import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Flower2,
  MessageCircleHeart,
  Sparkles,
} from "lucide-react";

import { BouquetPreview } from "@/components/boutique/bouquet-preview";
import { FlowerPhoto } from "@/components/flower-photo/flower-photo";
import { FlowerVideo } from "@/components/media/flower-video";
import { PexelsImage } from "@/components/media/pexels";
import { VideoMontage } from "@/components/media/video-montage";
import {
  CornerSprig,
  PetalBorder,
  PetalMark,
  WreathArc,
} from "@/components/ornament/botanical";
import { PageEmblem } from "@/components/ornament/page-emblem";
import { PageHeader, SectionHeading } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { COMMITMENTS, REVIEWS } from "@/data/avis";
import { SHOP_BOUQUETS } from "@/data/boutique";
import { COLOR_SWATCHES, seasonForDate } from "@/lib/constants";
import { getAllFlowers, getFlowerById, toFlowerLite } from "@/lib/flowers";
import {
  getHomeHero,
  getHomePhotos,
  getHomeVideos,
  videoSource,
  type Photo,
  type Video,
} from "@/lib/photos";
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

function entriesOf(items: Record<string, number>) {
  return Object.entries(items)
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
}

/** Une tuile du mur d'images : photo ou vidéo, mêlées dans la même grille. */
type Tile =
  | { kind: "photo"; photo: Photo; alt: string }
  | { kind: "video"; video: Video };

/**
 * Alterne photos et vidéos au lieu de les grouper : deux vidéos côte à côte
 * se disputent le regard, et une rangée entière de photos fixes après elles
 * fait retomber la page.
 */
function buildGallery(photos: readonly Photo[], videos: readonly Video[]): Tile[] {
  const tiles: Tile[] = [];
  let videoCursor = 0;
  for (const [index, photo] of photos.entries()) {
    tiles.push({ kind: "photo", photo, alt: photo.alt });
    const nextVideo = videos[videoCursor];
    if (nextVideo && index % 3 === 2) {
      tiles.push({ kind: "video", video: nextVideo });
      videoCursor += 1;
    }
  }
  return tiles;
}

export default function HomePage() {
  const season = seasonForDate(new Date());
  const inSeason = getAllFlowers()
    .filter(
      (flower) => flower.season.includes(season) && !flower.offSeasonImport,
    )
    .sort((a, b) => a.pricePerStem - b.pricePerStem)
    .slice(0, 6);

  const hero = SHOP_BOUQUETS[0];
  const heroEntries = hero ? entriesOf(hero.items) : [];

  // Le montage d'ouverture a ses propres plans ; les vidéos de la
  // photothèque ponctuent le mur d'images plus bas.
  const heroShots = getHomeHero().map(videoSource);
  const gallery = buildGallery(getHomePhotos(), getHomeVideos());

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="botanical overflow-hidden">
        <CornerSprig corner="top-left" seed="accueil-gauche" size={190} />
        <CornerSprig corner="bottom-right" seed="accueil-droite" size={160} />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-10 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
          <PageEmblem
            route="/"
            className="-left-24 top-4 -z-10 w-72 opacity-[0.05]"
          />

          <div>
            <p className="chip bg-pollen-tint text-[0.68rem] font-bold uppercase tracking-[0.13em] text-pollen-ink">
              <span aria-hidden className="size-[7px] rounded-full bg-pollen" />
              {SHOP.tagline}
            </p>
            <h1 className="heading-display mt-6 text-[3.4rem] sm:text-[4.6rem]">
              Dites-le avec
              <br />
              les fleurs{" "}
              <span className="italic text-magenta">justes</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Nous composons à la main, avec ce que le marché offre vraiment
              cette semaine. Composez votre bouquet tige par tige, voyez le prix
              bouger en direct, et laissez-vous conseiller quand vous hésitez.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<Link href="/composer" />}
                size="lg"
                variant="accent"
              >
                Composer mon bouquet <ArrowRight aria-hidden />
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/devis" />}
                size="lg"
                variant="outline"
                className="border-[1.5px] border-foreground"
              >
                Devis événement
              </Button>
            </div>

            <dl className="mt-12 flex flex-wrap gap-10 border-t border-border pt-7">
              <div>
                <dt className="sr-only">Variétés au catalogue</dt>
                <dd>
                  <span className="block font-heading text-[2.1rem] leading-none text-leaf">
                    {getAllFlowers().length}
                  </span>
                  <span className="mt-1 block text-[0.8rem] text-muted-foreground">
                    variétés au catalogue
                  </span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Outils en ligne</dt>
                <dd>
                  <span className="block font-heading text-[2.1rem] leading-none text-magenta">
                    4
                  </span>
                  <span className="mt-1 block text-[0.8rem] text-muted-foreground">
                    outils pour vous décider
                  </span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Devis</dt>
                <dd>
                  <span className="block font-heading text-[2.1rem] leading-none text-poppy">
                    PDF
                  </span>
                  <span className="mt-1 block text-[0.8rem] text-muted-foreground">
                    devis immédiat, sans engagement
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* `w-full` explicite : les plans du montage sont en position
              absolue, ils ne donnent donc aucune largeur intrinsèque à la
              colonne, qui se réduirait sinon au rembourrage de la carte. */}
          <Reveal className="w-full justify-self-center">
            <figure className="relative w-full">
              <WreathArc className="-top-6 scale-110" />
              <div className="rounded-[2rem] border border-border bg-card p-3 shadow-[var(--shadow-petal)]">
                {heroShots.length > 1 ? (
                  <VideoMontage
                    shots={heroShots}
                    className="h-[21rem] w-full rounded-[1.5rem] sm:h-[27rem]"
                  />
                ) : (
                  <div className="rounded-[1.5rem] border border-border/60 bg-secondary/25 p-3">
                    <BouquetPreview
                      entries={heroEntries}
                      wrapping={hero?.wrapping ?? "kraft simple"}
                      className="h-[21rem] w-full sm:h-[25rem]"
                      label="Illustration d'un bouquet composé à l'atelier"
                    />
                  </div>
                )}
              </div>
              {/* Aucune légende sous les médias, à la demande. L'origine des
                  images est mentionnée une seule fois, en pied de page. */}
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- les outils */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, index) => (
            <li key={tool.href}>
              <Reveal delayMs={index * 70}>
                <Link
                  href={tool.href}
                  className="card-lift card-petal block h-full rounded-xl border border-border bg-card p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="relative z-10 flex items-center gap-2 text-poppy">
                    <tool.icon className="size-5" aria-hidden />
                    <PetalMark className="opacity-50" />
                  </span>
                  <h2 className="relative z-10 mt-3 font-heading text-lg">
                    {tool.title}
                  </h2>
                  <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {tool.body}
                  </p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- la saison */}
      <section className="botanical overflow-hidden border-y border-border bg-secondary/40">
        <CornerSprig corner="top-right" seed="saison" size={176} />
        <CornerSprig corner="bottom-left" seed="saison-bas" size={148} />

        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="En ce moment"
              title={`La saison est ${season}`}
              lead="Ces fleurs sont à leur meilleur prix et à leur meilleure tenue en ce moment, sans import."
              actions={
                <Button
                  nativeButton={false}
                  render={<Link href="/catalogue" />}
                  variant="outline"
                  size="sm"
                >
                  Voir tout le catalogue
                </Button>
              }
            />
          </Reveal>

          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {inSeason.map((flower, index) => (
              <li key={flower.id}>
                <Reveal delayMs={index * 50}>
                  <Link
                    href={`/catalogue/${flower.id}`}
                    className="card-lift card-petal block rounded-xl border border-border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className="relative z-10 block h-28 overflow-hidden rounded-lg"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${COLOR_SWATCHES[flower.colors[0]].fill} 20%, var(--card))`,
                      }}
                    >
                      <FlowerPhoto
                        flower={toFlowerLite(flower)}
                        sizes="(min-width: 1024px) 14vw, (min-width: 640px) 28vw, 44vw"
                      />
                    </span>
                    <span className="relative z-10 mt-2.5 block truncate text-sm">
                      {flower.nameFr}
                    </span>
                    <span className="relative z-10 block text-xs text-muted-foreground">
                      {formatEuro(flower.pricePerStem)} / {flower.unit}
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <PetalBorder className="-mb-px" />
      </section>

      {/* ----------------------------------------------------- la sélection */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="La sélection"
            title="Trois bouquets que nous préparons souvent"
            actions={
              <Button
                nativeButton={false}
                render={<Link href="/boutique" />}
                variant="outline"
                size="sm"
              >
                Toute la sélection
              </Button>
            }
          />
        </Reveal>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_BOUQUETS.slice(1, 4).map((bouquet, index) => (
            <li key={bouquet.id}>
              <Reveal delayMs={index * 70}>
                <Link
                  href="/boutique"
                  className="card-lift card-petal block h-full overflow-hidden rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="relative z-10 block bg-secondary/40 px-4 pt-4">
                    <BouquetPreview
                      entries={entriesOf(bouquet.items)}
                      wrapping={bouquet.wrapping}
                      seed={index * 9 + 5}
                      className="h-48 w-full"
                    />
                  </span>
                  <span className="relative z-10 block p-5">
                    <span className="block font-heading text-xl">
                      {bouquet.name}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {bouquet.pitch}
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ l'atelier en images */}
      <section className="border-t border-border bg-[#241a12] text-[#fff7ec]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <SectionHeading
            eyebrow="En images"
            title="Ce à quoi ressemble une matinée ici"
            lead="Les fleurs arrivent tôt, on les nettoie, on les monte. Voilà l'atelier tel qu'il est."
          />

          {/* `dense` remplit les trous : sans lui, une tuile large qui ne
              rentre pas en fin de rangée laisse une case vide derrière elle. */}
          <ul className="mt-8 grid grid-flow-row-dense grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((item, index) => (
              <li
                key={item.kind === "video" ? `v-${item.video.pexelsId}` : `p-${item.photo.pexelsId}`}
                // Une tuile sur six occupe deux colonnes : une grille
                // parfaitement régulière ressemble à un tableur, pas à un mur
                // de photos.
                className={index % 6 === 0 ? "sm:col-span-2" : undefined}
              >
                <Reveal delayMs={(index % 4) * 60}>
                  {/* Hauteur fixe plutôt que ratio : une tuile large garderait
                      sinon une hauteur double et disloquerait la rangée. */}
                  <figure className="group relative h-40 overflow-hidden rounded-xl bg-white/5 sm:h-52">
                    {item.kind === "video" ? (
                      <FlowerVideo
                        video={videoSource(item.video)}
                        className="size-full"
                        posterWidth={800}
                      />
                    ) : (
                      <PexelsImage
                        photo={item.photo}
                        alt={item.alt}
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 48vw"
                        className="transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>

        </div>
      </section>

      {/* --------------------------------------------- avis ou engagements */}
      <section className="botanical overflow-hidden border-t border-border bg-secondary/40">
        <CornerSprig corner="top-left" seed="engagements" size={168} />

        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          {REVIEWS.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Vos retours"
                title="Ce qu'en disent nos clients"
              />
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {REVIEWS.map((review) => (
                  <li
                    key={`${review.author}-${review.date}`}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <PetalMark className="text-poppy" />
                    <blockquote className="mt-3 text-sm leading-relaxed">
                      « {review.text} »
                    </blockquote>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {review.author} — {review.occasion}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <SectionHeading
                eyebrow="La maison"
                title="Nos engagements"
                lead="Nous ne publions pas d'avis tant que nous n'en avons pas reçu de véritables. En attendant, voici ce sur quoi nous nous engageons."
              />
              <ul className="mt-8 grid gap-5 sm:grid-cols-3">
                {COMMITMENTS.map((commitment, index) => (
                  <li key={commitment.title}>
                    <Reveal delayMs={index * 70}>
                      <div className="card-petal h-full rounded-xl border border-border bg-card p-5">
                        <PetalMark className="relative z-10 text-poppy" />
                        <h3 className="relative z-10 mt-3 font-heading text-lg">
                          {commitment.title}
                        </h3>
                        <p className="relative z-10 mt-2 text-sm leading-relaxed text-muted-foreground">
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
        rule={false}
      >
        <div className="flex flex-wrap gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/contact" />}
            variant="outline"
          >
            Nous écrire
          </Button>
          <Button
            nativeButton={false}
            render={<a href={`tel:${SHOP.phoneHref}`} />}
            variant="ghost"
          >
            {SHOP.phoneDisplay}
          </Button>
        </div>
      </PageHeader>
    </>
  );
}
