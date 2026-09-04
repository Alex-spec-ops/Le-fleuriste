/**
 * Énumérations figées du domaine floral.
 * Toute donnée du catalogue et tout formulaire s'appuient sur ces listes :
 * elles sont la seule source de vocabulaire du projet.
 */

export const CATEGORIES = [
  "Roses",
  "Pivoines",
  "Tulipes",
  "Renoncules",
  "Orchidées",
  "Lys & Lilium",
  "Dahlias",
  "Chrysanthèmes",
  "Œillets",
  "Gerberas",
  "Hortensias",
  "Fleurs de champ & champêtres",
  "Fleurs séchées & stabilisées",
  "Feuillages & verdure",
  "Branchages",
  "Bulbes de printemps",
  "Fleurs exotiques & tropicales",
  "Graminées",
  "Plantes fleuries en pot",
  "Aromatiques & herbes",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COLORS = [
  "blanc",
  "crème",
  "ivoire",
  "jaune",
  "orange",
  "corail",
  "rose pâle",
  "rose vif",
  "fuchsia",
  "rouge",
  "bordeaux",
  "violet",
  "lavande",
  "bleu",
  "vert",
  "pêche",
  "bicolore",
] as const;
export type Color = (typeof COLORS)[number];

export const SEASONS = ["printemps", "été", "automne", "hiver", "toute l'année"] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = [
  "mariage",
  "romantique",
  "anniversaire",
  "remerciement",
  "invitation-dîner",
  "naissance",
  "condoléances",
  "félicitations",
  "entreprise",
  "réconfort",
  "excuses",
  "fête des mères",
  "Saint-Valentin",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

/**
 * Unité de vente. « pot » est un ajout au cahier des charges : la catégorie
 * imposée « Plantes fleuries en pot » n'avait pas d'unité correspondante.
 */
export const UNITS = ["tige", "botte", "branche", "pot"] as const;
export type Unit = (typeof UNITS)[number];

export const ROLES = ["focale", "secondaire", "remplissage", "feuillage", "structure"] as const;
export type Role = (typeof ROLES)[number];

export const FRAGRANCES = ["aucune", "légère", "prononcée"] as const;
export type Fragrance = (typeof FRAGRANCES)[number];

export const ALLERGEN_RISKS = ["faible", "moyen", "élevé"] as const;
export type AllergenRisk = (typeof ALLERGEN_RISKS)[number];

/** Styles de composition — influent sur le coefficient de main-d'œuvre et de densité. */
export const STYLES = [
  "champêtre",
  "romantique",
  "minimaliste",
  "luxuriant",
  "moderne",
  "pastel",
  "sauvage",
] as const;
export type Style = (typeof STYLES)[number];

export const EVENT_TYPES = [
  "mariage",
  "baptême",
  "anniversaire",
  "séminaire / entreprise",
  "funérailles",
  "autre",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const BOUQUET_SIZES = ["petit", "moyen", "grand", "généreux"] as const;
export type BouquetSize = (typeof BOUQUET_SIZES)[number];

export const WRAPPINGS = [
  "kraft simple",
  "papier de soie",
  "boîte chapeau",
  "vase inclus",
] as const;
export type Wrapping = (typeof WRAPPINGS)[number];

export const DELIVERY_MODES = [
  "retrait boutique",
  "locale",
  "départementale",
  "express jour même",
] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

/**
 * Correspondance couleur normalisée → teinte d'affichage.
 * Sert aux pastilles de filtre et à la colorisation des illustrations SVG.
 * `stroke` est une version assombrie pour les contours et le texte sur pastille.
 */
export const COLOR_SWATCHES: Readonly<Record<Color, { fill: string; stroke: string }>> = {
  blanc: { fill: "#FBFAF7", stroke: "#CFC9BC" },
  crème: { fill: "#F5EBD9", stroke: "#D4C39F" },
  ivoire: { fill: "#F3EEE0", stroke: "#CFC5AA" },
  jaune: { fill: "#F2C744", stroke: "#B58F17" },
  orange: { fill: "#E8873C", stroke: "#B25E1C" },
  corail: { fill: "#EF8267", stroke: "#C05840" },
  "rose pâle": { fill: "#F0C9CB", stroke: "#C1918F" },
  "rose vif": { fill: "#E8698F", stroke: "#B33C63" },
  fuchsia: { fill: "#C7357E", stroke: "#911E58" },
  rouge: { fill: "#C0392B", stroke: "#8A2318" },
  bordeaux: { fill: "#7B1E2B", stroke: "#4E1019" },
  violet: { fill: "#8A5BA6", stroke: "#5D3775" },
  lavande: { fill: "#B9A8D6", stroke: "#8877A8" },
  bleu: { fill: "#5C7FBF", stroke: "#37538A" },
  vert: { fill: "#7F9A63", stroke: "#54693F" },
  pêche: { fill: "#F3BE9C", stroke: "#C08B68" },
  bicolore: { fill: "#E8A98C", stroke: "#B06E4F" },
};

/** Ordre d'empilement des couches dans le rendu du bouquet (du fond vers l'avant). */
export const ROLE_LAYER_ORDER: readonly Role[] = [
  "feuillage",
  "structure",
  "remplissage",
  "secondaire",
  "focale",
];

/** Mois de l'année → saison, pour déduire la saisonnalité d'une date de livraison. */
export const MONTH_TO_SEASON: readonly Season[] = [
  "hiver", // janvier
  "hiver", // février
  "printemps", // mars
  "printemps", // avril
  "printemps", // mai
  "été", // juin
  "été", // juillet
  "été", // août
  "automne", // septembre
  "automne", // octobre
  "automne", // novembre
  "hiver", // décembre
];

export function seasonForDate(date: Date): Season {
  return MONTH_TO_SEASON[date.getMonth()];
}
