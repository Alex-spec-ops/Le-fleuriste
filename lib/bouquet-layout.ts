import { ROLE_LAYER_ORDER, type Role } from "@/lib/constants";
import { makeRandom, hashSeed } from "@/lib/flower-art";
import type { FlowerLite } from "@/lib/flowers";

/**
 * Disposition des tiges dans le bouquet.
 *
 * Les positions viennent d'une spirale d'angle d'or perturbée par un
 * générateur pseudo-aléatoire déterministe : même bouquet et même graine
 * donnent exactement le même dessin, et le bouton « mélanger » ne fait que
 * changer la graine.
 */

export const CANVAS = {
  width: 420,
  height: 480,
  /** Point de liage, là où toutes les tiges se rejoignent. */
  bindX: 210,
  bindY: 372,
  headX: 210,
  headY: 172,
  spreadX: 152,
  spreadY: 118,
} as const;

/** Rayon relatif et taille de tête selon le rôle de la fleur. */
const LAYER_STYLE: Record<Role, { spread: number; scale: number }> = {
  feuillage: { spread: 1.16, scale: 0.62 },
  structure: { spread: 1.08, scale: 0.66 },
  remplissage: { spread: 0.98, scale: 0.4 },
  secondaire: { spread: 0.85, scale: 0.5 },
  focale: { spread: 0.7, scale: 0.64 },
};

const GOLDEN_ANGLE = 2.399963229728653;

/** Au-delà, on cesse de dessiner : le rendu resterait illisible. */
export const MAX_RENDERED_STEMS = 160;

export type BouquetEntry = { flower: FlowerLite; quantity: number };

export type PlacedStem = {
  key: string;
  flower: FlowerLite;
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

export type BouquetLayout = {
  stems: PlacedStem[];
  /** Nombre de tiges non dessinées faute de place. */
  omitted: number;
  totalStems: number;
};

export function layoutBouquet(entries: readonly BouquetEntry[], seed: number): BouquetLayout {
  const ordered = [...entries].sort(
    (a, b) => ROLE_LAYER_ORDER.indexOf(a.flower.role) - ROLE_LAYER_ORDER.indexOf(b.flower.role),
  );

  const expanded: { flower: FlowerLite; occurrence: number }[] = [];
  for (const entry of ordered) {
    for (let occurrence = 0; occurrence < entry.quantity; occurrence += 1) {
      expanded.push({ flower: entry.flower, occurrence });
    }
  }

  const totalStems = expanded.length;
  const drawn = expanded.slice(0, MAX_RENDERED_STEMS);
  const count = drawn.length;
  const random = makeRandom(hashSeed(`bouquet-${seed}-${count}`));

  const stems: PlacedStem[] = drawn.map((stem, index) => {
    const style = LAYER_STYLE[stem.flower.role];
    // Les premières tiges (feuillage, structure) occupent l'extérieur.
    const progress = (index + 0.5) / Math.max(count, 1);
    const radius = Math.sqrt(1 - progress * 0.92);
    const angle = index * GOLDEN_ANGLE + seed * 0.618;

    const jitterX = (random() - 0.5) * 22;
    const jitterY = (random() - 0.5) * 18;

    const x = CANVAS.headX + Math.cos(angle) * radius * CANVAS.spreadX * style.spread + jitterX;
    const y = CANVAS.headY + Math.sin(angle) * radius * CANVAS.spreadY * style.spread + jitterY;

    const tilt = ((x - CANVAS.headX) / CANVAS.spreadX) * 16 + (random() - 0.5) * 10;
    const scale = style.scale * (0.9 + random() * 0.22);

    return {
      key: `${stem.flower.id}-${stem.occurrence}`,
      flower: stem.flower,
      x,
      y,
      rotate: tilt,
      scale,
    };
  });

  return { stems, omitted: totalStems - count, totalStems };
}

/** Courbe de la tige, du point de liage jusqu'à la tête. */
export function stemPath(stem: PlacedStem): string {
  const controlX = (stem.x + CANVAS.bindX) / 2 + (stem.x - CANVAS.bindX) * 0.12;
  const controlY = (stem.y + CANVAS.bindY) / 2;
  return `M${CANVAS.bindX} ${CANVAS.bindY} Q${controlX.toFixed(1)} ${controlY.toFixed(1)} ${stem.x.toFixed(1)} ${stem.y.toFixed(1)}`;
}
