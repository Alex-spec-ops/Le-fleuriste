/**
 * Avis clients.
 *
 * Le tableau est volontairement vide : nous ne publions pas de témoignages
 * inventés. Ajoutez ici les avis réellement reçus (en conservant l'accord de
 * leurs auteurs) et la section « Ce qu'en disent nos clients » apparaîtra
 * automatiquement sur la page d'accueil, en remplacement des engagements.
 *
 * Exemple d'entrée :
 * { author: "Camille R.", occasion: "mariage", date: "2026-06-14",
 *   text: "…", rating: 5 }
 */
export type Review = {
  author: string;
  occasion: string;
  /** Date au format aaaa-mm-jj. */
  date: string;
  text: string;
  /** Note sur cinq, facultative. */
  rating?: number;
};

export const REVIEWS: Review[] = [];

/** Engagements affichés tant qu'aucun avis n'a été publié. */
export const COMMITMENTS = [
  {
    title: "Un prix annoncé avant la commande",
    body: "Le composeur et le devis affichent le détail ligne à ligne. Vous savez ce que vous payez, et pourquoi.",
  },
  {
    title: "La saison dite honnêtement",
    body: "Une pivoine en décembre existe, mais elle vient de loin et elle coûte plus cher. C'est écrit noir sur blanc.",
  },
  {
    title: "Ce qu'il faut savoir avant d'offrir",
    body: "Pollen, toxicité pour les chats et les chiens, tenue réelle en vase : chaque fiche le précise.",
  },
] as const;
