"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Download,
  Eraser,
  FileText,
  Link2,
  MessageCircleHeart,
  Shuffle,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { BouquetOptions } from "@/components/composer/bouquet-options";
import {
  BouquetCanvas,
  exportBouquetPng,
} from "@/components/composer/bouquet-canvas";
import { BudgetAssistant } from "@/components/composer/budget-assistant";
import { AnimatedPrice } from "@/components/composer/animated-price";
import { FlowerPicker } from "@/components/composer/flower-picker";
import { PriceDetail } from "@/components/composer/price-detail";
import { CornerSprig, PetalMark } from "@/components/ornament/botanical";
import { Button } from "@/components/ui/button";
import { seasonForDate, type Category } from "@/lib/constants";
import { analyseHarmony } from "@/lib/bouquet-harmony";
import { decodeBouquet, encodeBouquet } from "@/lib/bouquet-share";
import { BOUQUET_TEMPLATES } from "@/lib/bouquet-templates";
import type { FlowerLite } from "@/lib/flowers";
import {
  formatEuro,
  priceBouquet,
  type BouquetOptions as PricingOptions,
} from "@/lib/pricing";
import { useBouquetStore } from "@/lib/store/bouquet-store";
import { useChatStore } from "@/lib/store/chat-store";

export function Composer({
  flowers,
  categories,
}: {
  flowers: FlowerLite[];
  categories: { category: Category; count: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const svgRef = useRef<SVGSVGElement>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const items = useBouquetStore((state) => state.items);
  const seed = useBouquetStore((state) => state.seed);
  const size = useBouquetStore((state) => state.size);
  const wrapping = useBouquetStore((state) => state.wrapping);
  const delivery = useBouquetStore((state) => state.delivery);
  const style = useBouquetStore((state) => state.style);
  const handwrittenCard = useBouquetStore((state) => state.handwrittenCard);
  const customRibbon = useBouquetStore((state) => state.customRibbon);

  const replace = useBouquetStore((state) => state.replace);
  const clear = useBouquetStore((state) => state.clear);
  const shuffle = useBouquetStore((state) => state.shuffle);
  const undo = useBouquetStore((state) => state.undo);
  const historyLength = useBouquetStore((state) => state.history.length);

  const openChat = useChatStore((state) => state.openWith);

  const byId = useMemo(
    () => new Map(flowers.map((flower) => [flower.id, flower])),
    [flowers],
  );

  const entries = useMemo(
    () =>
      Object.entries(items)
        .map(([flowerId, quantity]) => {
          const flower = byId.get(flowerId);
          return flower && quantity > 0 ? { flower, quantity } : null;
        })
        .filter(
          (entry): entry is { flower: FlowerLite; quantity: number } =>
            entry !== null,
        ),
    [items, byId],
  );

  const pricingOptions: PricingOptions = useMemo(
    () => ({
      size,
      wrapping,
      delivery,
      style,
      handwrittenCard,
      customRibbon,
      season: seasonForDate(new Date()),
    }),
    [size, wrapping, delivery, style, handwrittenCard, customRibbon],
  );

  const quote = useMemo(
    () => priceBouquet(entries, pricingOptions),
    [entries, pricingOptions],
  );
  const harmony = useMemo(() => analyseHarmony(entries), [entries]);

  // Un lien partagé prime sur la composition sauvegardée localement — mais il
  // faut attendre que celle-ci soit relue depuis le navigateur : la
  // réhydratation de zustand est asynchrone et écraserait sinon la
  // composition partagée juste après l'avoir posée.
  const appliedShare = useRef(false);
  useEffect(() => {
    if (appliedShare.current) return;
    const token = searchParams.get("b");
    if (!token) return;
    appliedShare.current = true;

    const shared = decodeBouquet(token);

    // On force la relecture du stockage avant d'écrire : la réhydratation de
    // zustand est asynchrone, et appliquer la composition partagée sans
    // l'attendre revient à la faire écraser par la composition précédente.
    void Promise.resolve(useBouquetStore.persist.rehydrate()).then(() => {
      if (shared) {
        replace(shared);
        toast.success("Composition partagée chargée");
      } else {
        toast.error("Ce lien de composition n'est plus valide.");
      }
      router.replace("/composer");
    });
  }, [searchParams, replace, router]);

  const share = async () => {
    const token = encodeBouquet({
      items,
      seed,
      size,
      wrapping,
      delivery,
      style,
      handwrittenCard,
      customRibbon,
    });
    const url = `${window.location.origin}/composer?b=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié", {
        description: "Il rouvre exactement cette composition.",
      });
    } catch {
      toast.info("Copiez ce lien", { description: url });
    }
  };

  const askFlorist = () => {
    if (entries.length === 0) {
      openChat("Je ne sais pas par où commencer, pouvez-vous me guider ?");
      return;
    }
    const composition = entries
      .map((entry) => `${entry.quantity} ${entry.flower.nameFr}`)
      .join(", ");
    openChat(
      `Voici ma composition : ${composition}. Total estimé ${formatEuro(quote.total)}. Qu'en pensez-vous, et que changeriez-vous ?`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-4 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Colonne gauche : le bouquet vivant */}
        <div>
          <div className="lg:sticky lg:top-24">
            <div className="botanical overflow-hidden rounded-2xl border border-border bg-card">
              <CornerSprig corner="top-left" seed="composeur" size={128} />
              <CornerSprig
                corner="bottom-right"
                seed="composeur-bas"
                size={110}
              />
              <BouquetCanvas
                ref={svgRef}
                entries={entries}
                seed={seed}
                wrapping={wrapping}
                /*
                 * Largeur automatique : le dessin fait 420 × 480, et un
                 * conteneur pleine largeur le laissait flotter au milieu de
                 * deux grandes marges vides, en le rapetissant d'autant.
                 */
                className="mx-auto h-[46vh] min-h-[320px] w-auto lg:h-[56vh]"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyLength === 0}
              >
                <Undo2 aria-hidden /> Annuler
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={shuffle}
                disabled={entries.length === 0}
              >
                <Shuffle aria-hidden /> Mélanger
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  clear();
                  toast("Bouquet vidé", {
                    description: "Vous pouvez annuler cette action.",
                  });
                }}
                disabled={entries.length === 0}
              >
                <Eraser aria-hidden /> Tout effacer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={entries.length === 0}
                onClick={async () => {
                  if (!svgRef.current) return;
                  try {
                    await exportBouquetPng(
                      svgRef.current,
                      "bouquet-le-fleuriste.png",
                    );
                    toast.success("Image enregistrée");
                  } catch {
                    toast.error("L'export d'image a échoué sur ce navigateur.");
                  }
                }}
              >
                <Download aria-hidden /> PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={share}
                disabled={entries.length === 0}
              >
                <Link2 aria-hidden /> Partager
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={askFlorist}
              >
                <MessageCircleHeart aria-hidden /> Demander l&apos;avis du
                fleuriste
              </Button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {quote.stemCount} tige{quote.stemCount > 1 ? "s" : ""} ·{" "}
              {entries.length} variété
              {entries.length > 1 ? "s" : ""}
              {size !== "moyen" ? ` · taille ${size}` : ""}
            </p>

            {harmony.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {harmony.map((note) => (
                  <li
                    key={note.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      note.tone === "bravo"
                        ? "border-leaf/40 bg-leaf/10"
                        : note.tone === "attention"
                          ? "border-poppy/40 bg-poppy/5"
                          : "border-border bg-secondary/50"
                    }`}
                  >
                    <PetalMark className="mr-1.5 inline-block -translate-y-px text-leaf" />
                    {note.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* Colonne droite : la sélection */}
        <div className="space-y-8">
          <section>
            <h2 className="flex items-center gap-2 font-heading text-lg">
              <PetalMark className="text-poppy" />
              Partir d&apos;un modèle
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Une base de fleuriste, que vous ajustez ensuite tige par tige.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BOUQUET_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    replace({
                      items: template.items,
                      seed,
                      size,
                      wrapping,
                      delivery,
                      style: template.style,
                      handwrittenCard,
                      customRibbon,
                    });
                    toast.success(`Modèle « ${template.label} » appliqué`, {
                      description: template.description,
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-foreground/30 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex h-[54vh] min-h-[380px] flex-col rounded-xl border border-border bg-card p-4">
            <h2 className="sr-only">Choisir des fleurs</h2>
            <FlowerPicker flowers={flowers} categories={categories} />
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-lg">
              <PetalMark className="text-poppy" />
              Options
            </h2>
            <div className="mt-4">
              <BouquetOptions />
            </div>
          </section>

          <BudgetAssistant
            catalog={flowers}
            options={pricingOptions}
            currentTotal={quote.total}
          />
        </div>
      </div>

      {/* Barre de prix collante */}
      <div className="sticky bottom-0 z-30 -mx-5 mt-8 border-t border-border bg-background/95 backdrop-blur sm:-mx-8">
        {detailOpen ? (
          <div className="mx-auto max-h-[45vh] w-full max-w-7xl overflow-y-auto border-b border-border px-5 sm:px-8">
            <PriceDetail quote={quote} />
          </div>
        ) : null}

        {/*
          La marge à droite réserve la place du bouton flottant du conseiller :
          64 px quand il est réduit à son icône, 208 px quand il porte son
          libellé, sans quoi il recouvre « Transformer en devis ».
        */}
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 pr-20 sm:px-8 sm:pr-52">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total estimé TTC
            </p>
            <AnimatedPrice value={quote.total} className="font-heading text-3xl" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={detailOpen}
              onClick={() => setDetailOpen((value) => !value)}
            >
              <ChevronDown
                className={
                  detailOpen
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
                aria-hidden
              />
              {detailOpen ? "Masquer le détail" : "Voir le détail"}
            </Button>
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/devis?bouquet=${encodeBouquet({
                    items,
                    seed,
                    size,
                    wrapping,
                    delivery,
                    style,
                    handwrittenCard,
                    customRibbon,
                  })}`}
                />
              }
              size="sm"
              variant="outline"
              disabled={entries.length === 0}
            >
              <FileText aria-hidden /> Transformer en devis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
