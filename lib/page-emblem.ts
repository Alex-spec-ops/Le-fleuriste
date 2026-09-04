/**
 * Emblème floral de chaque page.
 *
 * Chaque écran du site est placé sous une fleur du catalogue, dessinée en
 * filigrane derrière son titre. Ce n'est pas un motif décoratif interchangeable :
 * ce sont de vraies variétés que la boutique travaille, choisies pour ce que
 * la page raconte.
 */
export const PAGE_EMBLEM: Readonly<Record<string, { flowerId: string; why: string }>> = {
  "/": {
    flowerId: "pivoine-sarah-bernhardt",
    why: "la fleur la plus demandée de la boutique",
  },
  "/catalogue": {
    flowerId: "renoncule-clooney-hanoi",
    why: "la variété qui fait comprendre qu'un cultivar n'est pas l'autre",
  },
  "/composer": {
    flowerId: "rose-avalanche",
    why: "la base de la plupart des compositions montées à l'atelier",
  },
  "/devis": {
    flowerId: "hortensia-magical-jade",
    why: "la tête qui donne son volume à un centre de table",
  },
  "/boutique": {
    flowerId: "dahlia-cafe-au-lait",
    why: "le dahlia qui a relancé la mode du genre",
  },
  "/evenements": {
    flowerId: "pivoine-coral-charm",
    why: "la pivoine des mariages de juin",
  },
  "/a-propos": {
    flowerId: "chrysantheme-anastasia-vert",
    why: "la fleur que l'on croit connaître et qui surprend toujours",
  },
  "/contact": {
    flowerId: "tulipe-la-belle-epoque",
    why: "la tulipe que l'on vient voir de près en boutique",
  },
};

export function emblemFor(route: string): string | null {
  return PAGE_EMBLEM[route]?.flowerId ?? null;
}
