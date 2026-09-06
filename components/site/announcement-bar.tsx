import { formatOpeningSummary } from "@/lib/shop";
import { FREE_LOCAL_DELIVERY_FROM, formatEuro } from "@/lib/pricing";

/**
 * Bandeau d'annonce, en tête de toutes les pages.
 *
 * Les trois messages sont des faits vérifiables ailleurs sur le site :
 * les horaires viennent de la configuration boutique, la franchise de port
 * du moteur de prix. Rien n'y est promotionnel.
 */
const CLAIMS = [
  formatOpeningSummary(),
  "Arrivage du marché tous les matins",
  `Livraison locale offerte dès ${formatEuro(FREE_LOCAL_DELIVERY_FROM)}`,
];

export function AnnouncementBar() {
  return (
    <div className="bg-leaf-deep text-[#f3fff6]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-4 px-5 py-2.5 text-center text-[0.78rem] tracking-[0.02em] sm:gap-7 sm:px-8">
        {CLAIMS.map((claim, index) => (
          <span key={claim} className="flex items-center gap-4 sm:gap-7">
            {index > 0 ? (
              <span
                aria-hidden
                className="hidden size-[5px] shrink-0 rounded-full bg-leaf-bright sm:block"
              />
            ) : null}
            {/* Sur mobile, seul le premier message tient sans se tasser. */}
            <span className={index === 0 ? "" : "hidden sm:inline"}>{claim}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
