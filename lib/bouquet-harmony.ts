import type { Color, Role } from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";

/**
 * Contrôle d'harmonie : des remarques de fleuriste, jamais un blocage.
 * Le client reste libre de composer ce qu'il veut ; l'outil se contente de
 * dire ce qu'un professionnel dirait en regardant par-dessus son épaule.
 */

export type HarmonyNote = {
  id: string;
  tone: "conseil" | "attention" | "bravo";
  message: string;
};

/** Familles chromatiques, pour juger d'une palette sans compter les nuances. */
const COLOR_FAMILY: Readonly<Record<Color, string>> = {
  blanc: "clair",
  crème: "clair",
  ivoire: "clair",
  "rose pâle": "poudré",
  pêche: "poudré",
  lavande: "poudré",
  jaune: "chaud",
  orange: "chaud",
  corail: "chaud",
  "rose vif": "vif",
  fuchsia: "vif",
  rouge: "vif",
  bordeaux: "sombre",
  violet: "sombre",
  bleu: "froid",
  vert: "végétal",
  bicolore: "vif",
};

export type HarmonyInput = { flower: FlowerLite; quantity: number };

export function analyseHarmony(entries: readonly HarmonyInput[]): HarmonyNote[] {
  const notes: HarmonyNote[] = [];
  const totalStems = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  if (totalStems === 0) return notes;

  const byRole = new Map<Role, number>();
  for (const entry of entries) {
    byRole.set(entry.flower.role, (byRole.get(entry.flower.role) ?? 0) + entry.quantity);
  }
  const focal = byRole.get("focale") ?? 0;
  const green = (byRole.get("feuillage") ?? 0) + (byRole.get("remplissage") ?? 0);
  const structural = byRole.get("structure") ?? 0;

  if (focal === 0 && totalStems >= 3) {
    notes.push({
      id: "sans-focale",
      tone: "conseil",
      message:
        "Aucune fleur ne domine : ajoutez une ou deux fleurs focales pour donner un point de regard au bouquet.",
    });
  }

  if (totalStems >= 8 && green === 0) {
    notes.push({
      id: "sans-verdure",
      tone: "conseil",
      message:
        "Il manque de la verdure ou une fleur de remplissage : c'est ce qui donne de l'air entre les têtes.",
    });
  }

  if (totalStems >= 10 && focal / totalStems > 0.75) {
    notes.push({
      id: "trop-de-focales",
      tone: "attention",
      message:
        "Beaucoup de fleurs focales : le bouquet risque d'être massif. Une fleur secondaire allégerait l'ensemble.",
    });
  }

  const families = new Set<string>();
  for (const entry of entries) {
    for (const color of entry.flower.colors) families.add(COLOR_FAMILY[color]);
  }
  families.delete("végétal");

  if (families.size >= 4) {
    notes.push({
      id: "palette-dispersee",
      tone: "attention",
      message: `La palette réunit ${families.size} familles de teintes. En retirer une rendrait la composition plus lisible.`,
    });
  }

  if (families.has("vif") && families.has("poudré") && families.size >= 3) {
    notes.push({
      id: "vif-et-poudre",
      tone: "conseil",
      message:
        "Les tons vifs écrasent les tons poudrés. Choisissez un camp, ou faites la transition avec du crème.",
    });
  }

  const fragile = entries.filter((entry) => entry.flower.vaseLifeDays[1] <= 6);
  const durable = entries.filter((entry) => entry.flower.vaseLifeDays[0] >= 10);
  if (fragile.length > 0 && durable.length > 0 && totalStems >= 8) {
    notes.push({
      id: "tenue-inegale",
      tone: "conseil",
      message: `${fragile[0]?.flower.nameFr} tiendra beaucoup moins longtemps que le reste : prévoyez de la retirer en premier.`,
    });
  }

  const toxic = entries.filter((entry) => entry.flower.toxicPets);
  if (toxic.length > 0) {
    notes.push({
      id: "toxique-animaux",
      tone: "attention",
      message: `${toxic.length} variété${toxic.length > 1 ? "s sont toxiques" : " est toxique"} pour les chats et les chiens. À signaler si le bouquet part dans un foyer avec animaux.`,
    });
  }

  const strongAllergen = entries.filter((entry) => entry.flower.allergenRisk === "élevé");
  if (strongAllergen.length > 0) {
    notes.push({
      id: "allergenes",
      tone: "attention",
      message: `Pollen important sur ${strongAllergen.map((entry) => entry.flower.nameFr).slice(0, 2).join(", ")} : à éviter pour une personne sensible.`,
    });
  }

  if (
    notes.length === 0 &&
    totalStems >= 9 &&
    focal > 0 &&
    green > 0 &&
    (structural > 0 || (byRole.get("secondaire") ?? 0) > 0)
  ) {
    notes.push({
      id: "equilibre",
      tone: "bravo",
      message: "Bouquet équilibré : une dominante claire, du volume secondaire et de la verdure.",
    });
  }

  return notes;
}
