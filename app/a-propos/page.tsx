import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { getAllFlowers, getCategorySummaries } from "@/lib/flowers";
import { SHOP, formatOpeningSummary } from "@/lib/shop";

export const metadata: Metadata = {
  title: "L'atelier",
  description:
    "Comment nous travaillons : approvisionnement au marché, saisonnalité assumée, compositions montées à la main dans le 10ᵉ arrondissement de Paris.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  const categories = getCategorySummaries();
  const flowers = getAllFlowers();
  const seasonal = flowers.filter(
    (flower) => !flower.season.includes("toute l'année"),
  ).length;

  return (
    <>
      <PageHeader
        route="/a-propos"
        eyebrow="L'atelier"
        title="Un métier de marché, pas de catalogue"
        lead="Nous achetons ce qui est beau le jour où nous l'achetons. C'est pour cela que le site vous dit la saison réelle de chaque fleur, et vous prévient quand une variété vient de loin."
      />

      <section className="mx-auto grid w-full max-w-5xl gap-12 px-5 pb-14 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <article className="space-y-4">
            <h2 className="heading-display text-2xl">
              L&apos;approvisionnement
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              L&apos;essentiel de nos fleurs vient du marché de Rungis,
              plusieurs fois par semaine, complété par des producteurs français
              quand la saison le permet : pivoines du Val de Loire au printemps,
              dahlias d&apos;Île-de-France en fin d&apos;été, renoncules
              méditerranéennes en hiver.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Certaines variétés viennent de plus loin — roses du Kenya ou
              d&apos;Équateur, orchidées de Thaïlande. Nous ne le cachons pas :
              le catalogue l&apos;indique, et le simulateur applique la
              majoration correspondante quand une fleur est demandée hors de sa
              saison.
            </p>
          </article>
        </Reveal>

        <Reveal delayMs={80}>
          <article className="space-y-4">
            <h2 className="heading-display text-2xl">Le travail</h2>
            <p className="leading-relaxed text-muted-foreground">
              Chaque bouquet est monté à la main, en spirale, sur le comptoir de
              l&apos;atelier. Nous recoupons les tiges à l&apos;oblique, nous
              retirons les feuilles immergées, et nous vous disons franchement
              combien de jours la composition tiendra.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Pour un événement, nous repérons le lieu quand c&apos;est
              possible, nous réservons les fleurs dix jours avant, et nous
              installons la veille ou le matin même.
            </p>
          </article>
        </Reveal>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
          <h2 className="heading-display text-2xl">Le catalogue en chiffres</h2>
          <dl className="mt-8 grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">
                Variétés référencées
              </dt>
              <dd className="font-heading text-4xl">{flowers.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                Familles travaillées
              </dt>
              <dd className="font-heading text-4xl">{categories.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                Variétés strictement saisonnières
              </dt>
              <dd className="font-heading text-4xl">{seasonal}</dd>
            </div>
          </dl>
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Chaque fiche indique la tenue réelle en vase, le risque allergène
            lié au pollen et la toxicité éventuelle pour les chats et les
            chiens. Ce sont des informations que l&apos;on nous demande tous les
            jours au comptoir.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
        <h2 className="heading-display text-2xl">Nous rendre visite</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          L&apos;atelier se trouve dans le {SHOP.district} de {SHOP.city}.{" "}
          {formatOpeningSummary()}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/contact" />}>
            Coordonnées et horaires
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/catalogue" />}
            variant="outline"
          >
            Parcourir le catalogue
          </Button>
        </div>
      </section>
    </>
  );
}
