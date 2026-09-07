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
  spreadX: 158,
  spreadY: 124,
} as const;

/**
 * Rayon relatif et taille de tête selon le rôle de la fleur.
 *
 * Les rayons sont resserrés et les têtes agrandies par rapport à un placement
 * « propre » : dans un vrai bouquet les fleurs se touchent et se chevauchent.
 * Espacées, elles ressemblent à des sucettes plantées dans du papier.
 */
const LAYER_STYLE: Record<Role, { spread: number; scale: number }> = {
  feuillage: { spread: 1.02, scale: 0.86 },
  structure: { spread: 0.94, scale: 0.94 },
  remplissage: { spread: 0.84, scale: 0.62 },
  secondaire: { spread: 0.74, scale: 0.76 },
  focale: { spread: 0.62, scale: 0.96 },
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
  /**
   * Profondeur perçue, de 0 (fond du bouquet) à 1 (premier plan).
   * Elle pilote la taille et l'atténuation : sans elle, toutes les têtes
   * sont au même plan et le bouquet reste plat.
   */
  depth: number;
  /** Opacité appliquée à la tête, plus faible au fond. */
  opacity: number;
  /**
   * Écrasement horizontal de la tête, de 0 à 1.
   *
   * Un bouquet est bombé : les fleurs du pourtour sont vues de biais, pas de
   * face. Sans cet aplatissement, toutes les corolles regardent l'objectif et
   * la botte devient un disque.
   */
  squeezeX: number;
  /** Écrasement vertical, pour les têtes du haut qui basculent en arrière. */
  squeezeY: number;
  /** Épaisseur de la tige, variable d'une fleur à l'autre. */
  stemWidth: number;
  /** Teinte de la tige : toutes vertes, mais jamais du même vert. */
  stemTone: string;
};

/** Verts de tige, du plus sombre au plus clair. */
const STEM_TONES = ["#245939", "#2C6B45", "#357B50", "#3E8A5A"] as const;

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
    // Le bouquet est bombé, pas plat : les tiges du fond montent un peu plus
    // haut que celles du premier plan, comme dans une main serrée en spirale.
    const dome = (1 - progress) * 16;
    const y =
      CANVAS.headY + Math.sin(angle) * radius * CANVAS.spreadY * style.spread - dome + jitterY;

    const tilt = ((x - CANVAS.headX) / CANVAS.spreadX) * 16 + (random() - 0.5) * 10;

    // Les premières tiges dessinées sont au fond : elles rapetissent et
    // s'estompent, ce qui creuse le bouquet au lieu de le laisser plat.
    const depth = progress;
    const scale = style.scale * (0.78 + depth * 0.3) * (0.94 + random() * 0.14);
    const opacity = 0.72 + depth * 0.28;

    // Plus la fleur s'éloigne de l'axe, plus elle est vue de trois quarts.
    const offAxisX = Math.min(1, Math.abs(x - CANVAS.headX) / CANVAS.spreadX);
    const offAxisY = Math.max(0, (CANVAS.headY - y) / CANVAS.spreadY);
    const squeezeX = 1 - offAxisX * 0.26;
    const squeezeY = 1 - Math.min(1, offAxisY) * 0.18;

    return {
      key: `${stem.flower.id}-${stem.occurrence}`,
      flower: stem.flower,
      x,
      y,
      rotate: tilt,
      scale,
      depth,
      opacity,
      squeezeX,
      squeezeY,
      stemWidth: 1.2 + depth * 1.1 + random() * 0.5,
      stemTone: STEM_TONES[Math.floor(random() * STEM_TONES.length)] ?? STEM_TONES[1],
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

/* --------------------------------------------------------------- feuillage */

/**
 * Verdure du bouquet.
 *
 * C'est ce qui manquait le plus au dessin : un fleuriste monte un tiers de
 * feuillage, jamais des fleurs seules. Les brins sortent du même point de
 * liage, débordent un peu du cercle des fleurs et passent derrière elles, ce
 * qui donne au bouquet un pourtour irrégulier au lieu d'un disque net.
 */

/** Deux décimales : au-delà, le serveur et le client ne s'accordent plus. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

type Point = { x: number; y: number };

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Angle de la tangente à la courbe, en degrés. */
function quadraticAngle(p0: Point, p1: Point, p2: Point, t: number): number {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export type Leaf = { x: number; y: number; angle: number; length: number };

export type FoliageSprig = {
  key: string;
  /** Courbe de la tige du brin, du liage vers l'extérieur. */
  d: string;
  leaves: Leaf[];
  tone: string;
  width: number;
  opacity: number;
};

/** Verts du feuillage, plus francs que ceux des tiges. */
const LEAF_TONES = ["#2F7A4B", "#3E9E5C", "#4FAF6B", "#5C8F52", "#357044"] as const;

/**
 * Un brin de verdure pour deux tiges environ, plafonné : au-delà, la verdure
 * mange les fleurs au lieu de les porter.
 */
function sprigCount(stems: number): number {
  if (stems === 0) return 0;
  return Math.min(26, Math.max(6, Math.round(stems * 0.7)));
}

export function layoutFoliage(stemCount: number, seed: number): FoliageSprig[] {
  const count = sprigCount(stemCount);
  if (count === 0) return [];

  const random = makeRandom(hashSeed(`feuillage-${seed}-${count}`));
  const sprigs: FoliageSprig[] = [];

  for (let index = 0; index < count; index += 1) {
    // Réparti sur un demi-tour vers le haut, jamais vers le bas : rien ne
    // pousse sous le point de liage.
    const spread = (index + 0.5) / count;
    const angle = Math.PI * (1.04 + spread * 0.92) + (random() - 0.5) * 0.26;
    // Un brin sur trois reste court et comble le creux entre l'emballage et
    // les fleurs ; les autres dépassent à peine du cercle des corolles. Un
    // feuillage qui part trop loin ressemble à une antenne, pas à un bouquet.
    const short = index % 2 === 1;
    const reach = short ? 0.3 + random() * 0.16 : 0.7 + random() * 0.2;

    const tip: Point = {
      x: CANVAS.headX + Math.cos(angle) * CANVAS.spreadX * reach,
      y: CANVAS.headY + Math.sin(angle) * CANVAS.spreadY * reach * 0.92,
    };
    const base: Point = { x: CANVAS.bindX, y: CANVAS.bindY };
    // Le point de contrôle décale la courbe vers l'extérieur : un brin de
    // verdure ne monte pas droit, il s'échappe.
    const control: Point = {
      x: (base.x + tip.x) / 2 + (tip.x - base.x) * (0.24 + random() * 0.2),
      y: (base.y + tip.y) / 2 + 16 - random() * 26,
    };

    const pairs = 4 + Math.floor(random() * 3);
    const leaves: Leaf[] = [];
    for (let pair = 0; pair < pairs; pair += 1) {
      // Le feuillage commence bas, juste au-dessus du liage : c'est là que le
      // bouquet se dégarnissait, entre le papier et la première corolle.
      const t = 0.24 + (pair / Math.max(pairs - 1, 1)) * 0.7;
      const point = quadraticPoint(base, control, tip, t);
      const along = quadraticAngle(base, control, tip, t);
      // Les feuilles rapetissent vers la pointe, comme sur une vraie tige.
      const length = (7.5 + random() * 4.5) * (1.15 - t * 0.4);
      for (const side of [-1, 1]) {
        leaves.push({
          x: round1(point.x),
          y: round1(point.y),
          angle: round1(along + side * (52 + random() * 24)),
          length: round1(length * (0.85 + random() * 0.3)),
        });
      }
    }

    sprigs.push({
      key: `brin-${index}`,
      d: `M${round1(base.x)} ${round1(base.y)} Q${round1(control.x)} ${round1(control.y)} ${round1(tip.x)} ${round1(tip.y)}`,
      leaves,
      tone: LEAF_TONES[Math.floor(random() * LEAF_TONES.length)] ?? LEAF_TONES[1],
      width: round1(1 + random() * 1.1),
      opacity: round1(0.55 + random() * 0.35),
    });
  }

  return sprigs;
}
