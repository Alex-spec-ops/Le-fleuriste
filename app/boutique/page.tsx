import type { Metadata } from "next";
import Link from "next/link";

import { ShopBouquetCard } from "@/components/boutique/shop-bouquet-card";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { SHOP_BOUQUETS } from "@/data/boutique";

export const metadata: Metadata = {
  title: "Bouquets prêts à commander",
  description:
    "La sélection du fleuriste : des compositions déjà pensées, chiffrées, que vous pouvez commander telles quelles ou personnaliser.",
  alternates: { canonical: "/boutique" },
};

export default function BoutiquePage() {
  return (
    <>
      <PageHeader
        eyebrow="La boutique"
        title="Nos bouquets prêts à commander"
        lead="Huit compositions que nous préparons régulièrement. Chacune est modifiable : ouvrez-la dans le composeur pour l'ajuster à votre goût et à votre budget."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_BOUQUETS.map((bouquet) => (
            <li key={bouquet.id}>
              <ShopBouquetCard bouquet={bouquet} />
            </li>
          ))}
        </ul>

        <div className="mt-14 rounded-2xl border border-border bg-secondary/40 px-6 py-10 text-center">
          <h2 className="heading-display text-2xl">
            Rien qui vous corresponde ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Composez le vôtre tige par tige, ou dites-nous simplement pour qui
            c&apos;est : nous vous orientons.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button nativeButton={false} render={<Link href="/composer" />}>
              Composer mon bouquet
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/catalogue" />}
              variant="outline"
            >
              Parcourir le catalogue
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
