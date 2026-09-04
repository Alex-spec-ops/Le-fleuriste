/**
 * Coordonnées et informations de la boutique.
 * Point unique de vérité : toute modification ici se propage au site,
 * au devis PDF, au pied de page, à la page contact et au JSON-LD.
 */

export type OpeningDay = {
  /** Nom français du jour, en minuscules. */
  readonly label: string;
  /** Code JSON-LD schema.org (`Monday`, …). */
  readonly schemaDay: string;
  /** Horaires au format `HH:MM`, ou `null` si fermé. */
  readonly opens: string | null;
  readonly closes: string | null;
};

export const SHOP = {
  name: "LE Fleuriste",
  tagline: "Artisan fleuriste, Paris 10ᵉ",
  /** Adresse postale : non communiquée pour l'instant. */
  streetAddress: null as string | null,
  postalCode: "75010",
  city: "Paris",
  district: "10ᵉ arrondissement",
  country: "France",
  phone: "0612802139",
  phoneDisplay: "06 12 80 21 39",
  phoneHref: "+33612802139",
  email: "lefleuristedu10@gmail.com",
  /** Utilisé pour les métadonnées absolues (og:image, sitemap, JSON-LD). */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lefleuristedu10.fr",
  hours: [
    { label: "lundi", schemaDay: "Monday", opens: "07:00", closes: "19:00" },
    { label: "mardi", schemaDay: "Tuesday", opens: "07:00", closes: "19:00" },
    { label: "mercredi", schemaDay: "Wednesday", opens: "07:00", closes: "19:00" },
    { label: "jeudi", schemaDay: "Thursday", opens: "07:00", closes: "19:00" },
    { label: "vendredi", schemaDay: "Friday", opens: "07:00", closes: "19:00" },
    { label: "samedi", schemaDay: "Saturday", opens: "07:00", closes: "19:00" },
    { label: "dimanche", schemaDay: "Sunday", opens: null, closes: null },
  ] satisfies readonly OpeningDay[],
} as const;

/** Résumé lisible des horaires, regroupé par plage identique. */
export function formatOpeningSummary(): string {
  return "Du lundi au samedi, de 7 h à 19 h. Fermé le dimanche.";
}

/** Adresse sur une ligne, sans rue tant que celle-ci n'est pas renseignée. */
export function formatPostalAddress(): string {
  const parts = [SHOP.streetAddress, `${SHOP.postalCode} ${SHOP.city}`].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join(", ");
}
