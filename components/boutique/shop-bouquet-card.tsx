import Link from "next/link";

import { BouquetPreview } from "@/components/boutique/bouquet-preview";
import { PexelsImage } from "@/components/media/pexels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShopBouquet } from "@/data/boutique";
import { encodeBouquet } from "@/lib/bouquet-share";
import { seasonForDate } from "@/lib/constants";
import { getFlowerById } from "@/lib/flowers";
import { getBouquetPhoto } from "@/lib/photos";
import { formatEuro, priceBouquet } from "@/lib/pricing";

/**
 * Carte d'un bouquet de la sélection. Le prix vient du moteur commun, donc il
 * correspond exactement à ce que le composeur affichera si le client ouvre la
 * composition pour la personnaliser.
 */
export function ShopBouquetCard({ bouquet }: { bouquet: ShopBouquet }) {
  const photo = getBouquetPhoto(bouquet.id);
  const entries = Object.entries(bouquet.items)
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

  const quote = priceBouquet(entries, {
    size: bouquet.size,
    wrapping: bouquet.wrapping,
    delivery: "retrait boutique",
    style: bouquet.style,
    handwrittenCard: false,
    customRibbon: false,
    season: seasonForDate(new Date()),
  });

  const token = encodeBouquet({
    items: bouquet.items,
    seed: 1,
    size: bouquet.size,
    wrapping: bouquet.wrapping,
    delivery: "retrait boutique",
    style: bouquet.style,
    handwrittenCard: false,
    customRibbon: false,
  });

  return (
    <article className="card-lift card-petal flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* La photo dit l'allure, la liste des tiges juste dessous dit ce qui
          est réellement livré. L'illustration vectorielle reprend la main si
          la photothèque n'a rien pour cette composition. */}
      {photo ? (
        <div className="relative h-56 w-full overflow-hidden bg-secondary/40">
          <PexelsImage
            photo={photo}
            alt={`${bouquet.name} — photo d'illustration`}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          />
        </div>
      ) : (
        <div className="bg-secondary/40 px-4 pt-4">
          <BouquetPreview
            entries={entries}
            wrapping={bouquet.wrapping}
            className="h-56 w-full"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-heading text-xl">{bouquet.name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {bouquet.pitch}
          </p>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {bouquet.occasions.map((occasion) => (
            <li key={occasion}>
              <Badge variant="secondary" className="font-normal">
                {occasion}
              </Badge>
            </li>
          ))}
        </ul>

        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {entries.map((entry) => (
            <li key={entry.flower.id}>
              {entry.quantity} × {entry.flower.nameFr}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p>
            <span className="font-heading text-2xl">
              {formatEuro(quote.total)}
            </span>
            <span className="block text-xs text-muted-foreground">
              taille {bouquet.size}, {bouquet.wrapping}
            </span>
          </p>
          <Button
            nativeButton={false}
            render={<Link href={`/composer?b=${token}`} />}
            size="sm"
            variant="outline"
          >
            Personnaliser
          </Button>
        </div>
      </div>
    </article>
  );
}
