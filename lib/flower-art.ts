import { COLOR_SWATCHES, type Category, type Color, type Role } from "@/lib/constants";
import type { Flower } from "@/lib/schemas/flower";

/**
 * Illustrations SVG paramétriques.
 *
 * Une forme de base par famille florale, colorisée depuis `colors[0]` et
 * légèrement variée par une graine déterministe tirée de l'identifiant :
 * une même fleur donne toujours exactement le même dessin, et deux cultivars
 * de la même famille ne sont jamais superposables.
 *
 * Le module ne dépend pas de React : il produit une liste de primitives que
 * le composant `<FlowerSvg>` rend en JSX et que `flowerSvgMarkup()` sérialise
 * pour la route /illustrations/[id].svg.
 */

export type Shape =
  | { kind: "path"; d: string; fill: string; opacity?: number }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      rotate?: number;
      opacity?: number;
    }
  | { kind: "stroke"; d: string; stroke: string; width: number; opacity?: number };

export type FlowerArt = {
  /** Repère : tête centrée en (50, 46), tige jusqu'en bas du cadre. */
  viewBox: string;
  shapes: Shape[];
  /** Teinte dominante, utile pour les fonds et les pastilles. */
  accent: string;
};

export const ART_VIEWBOX = "0 0 100 160";

export type ShapeFamily =
  | "corolle"
  | "marguerite"
  | "coupe"
  | "trompette"
  | "ombelle"
  | "epi"
  | "pompon"
  | "feuillage";

/* ------------------------------------------------------------------ couleur */

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` positif éclaircit vers le blanc, négatif assombrit vers le noir. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  return rgbToHex([
    r + (target - r) * ratio,
    g + (target - g) * ratio,
    b + (target - b) * ratio,
  ]);
}

/** Mélange deux teintes, `ratio` = part de `b`. */
export function mix(a: string, b: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  ]);
}

const STEM_GREEN = "#6E8464";
const LEAF_GREEN = "#7F9A6C";

/* ------------------------------------------------------------------- graine */

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Générateur déterministe : même graine, même suite de nombres. */
export function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ famille */

const FAMILY_BY_CATEGORY: Readonly<Record<Category, ShapeFamily>> = {
  Roses: "corolle",
  Pivoines: "corolle",
  Tulipes: "coupe",
  Renoncules: "corolle",
  Orchidées: "trompette",
  "Lys & Lilium": "trompette",
  Dahlias: "marguerite",
  Chrysanthèmes: "pompon",
  Œillets: "pompon",
  Gerberas: "marguerite",
  Hortensias: "ombelle",
  "Fleurs de champ & champêtres": "marguerite",
  "Fleurs séchées & stabilisées": "epi",
  "Feuillages & verdure": "feuillage",
  Branchages: "feuillage",
  "Bulbes de printemps": "coupe",
  "Fleurs exotiques & tropicales": "trompette",
  Graminées: "epi",
  "Plantes fleuries en pot": "pompon",
  "Aromatiques & herbes": "epi",
};

export function shapeFamily(category: Category, role: Role): ShapeFamily {
  if (role === "feuillage") return "feuillage";
  return FAMILY_BY_CATEGORY[category];
}

/* ------------------------------------------------------------- constructeurs */

type Palette = { base: string; light: string; dark: string; deep: string; heart: string };

function palette(colors: readonly Color[]): Palette {
  const primary = COLOR_SWATCHES[colors[0]];
  const secondary = colors[1] ? COLOR_SWATCHES[colors[1]] : primary;
  const base = primary.fill;
  return {
    base,
    light: shade(base, 0.22),
    dark: primary.stroke,
    deep: shade(primary.stroke, -0.12),
    heart: mix(base, secondary.fill, 0.55),
  };
}

function petalEllipse(
  cx: number,
  cy: number,
  distance: number,
  angleDeg: number,
  rx: number,
  ry: number,
  fill: string,
): Shape {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    kind: "ellipse",
    cx: cx + Math.cos(angle) * distance,
    cy: cy + Math.sin(angle) * distance,
    rx,
    ry,
    fill,
    rotate: angleDeg + 90,
  };
}

function corolle(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const rings = [
    { count: 9, distance: 25, rx: 15, ry: 12, fill: tone.dark },
    { count: 8, distance: 18, rx: 13, ry: 10, fill: tone.base },
    { count: 6, distance: 11, rx: 10, ry: 8, fill: tone.light },
  ];
  for (const [index, ring] of rings.entries()) {
    const offset = random() * 40 + index * 17;
    for (let petal = 0; petal < ring.count; petal += 1) {
      const angle = offset + (360 / ring.count) * petal;
      shapes.push(
        petalEllipse(50, 46, ring.distance, angle, ring.rx, ring.ry, ring.fill),
      );
    }
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 8, fill: tone.heart });
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 4, fill: shade(tone.heart, -0.2) });
  return shapes;
}

function marguerite(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const outer = 13 + Math.floor(random() * 4);
  const offset = random() * 30;
  for (let petal = 0; petal < outer; petal += 1) {
    const angle = offset + (360 / outer) * petal;
    shapes.push(petalEllipse(50, 46, 26, angle, 6.5, 17, tone.base));
  }
  const inner = Math.max(8, outer - 4);
  for (let petal = 0; petal < inner; petal += 1) {
    const angle = offset + 12 + (360 / inner) * petal;
    shapes.push(petalEllipse(50, 46, 17, angle, 5, 12, tone.light));
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 10, fill: shade(tone.dark, -0.25) });
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 6, fill: tone.heart, opacity: 0.9 });
  return shapes;
}

function coupe(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const lean = (random() - 0.5) * 6;
  return [
    {
      kind: "path",
      d: `M32 ${52 + lean} C30 28 38 16 50 14 C62 16 70 28 68 ${52 + lean} C62 62 38 62 32 ${52 + lean} Z`,
      fill: tone.dark,
    },
    {
      kind: "path",
      d: `M37 ${54 + lean} C35 32 41 20 50 18 C59 20 65 32 63 ${54 + lean} C58 62 42 62 37 ${54 + lean} Z`,
      fill: tone.base,
    },
    {
      kind: "path",
      d: `M44 ${56 + lean} C42 36 45 24 50 22 C55 24 58 36 56 ${56 + lean} C54 60 46 60 44 ${56 + lean} Z`,
      fill: tone.light,
    },
  ];
}

function trompette(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const petals = 6;
  const offset = random() * 24;
  for (let petal = 0; petal < petals; petal += 1) {
    const angle = offset + (360 / petals) * petal;
    shapes.push(petalEllipse(50, 46, 22, angle, 8, 22, petal % 2 === 0 ? tone.base : tone.dark));
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 9, fill: tone.heart });
  for (let stamen = 0; stamen < 5; stamen += 1) {
    const angle = ((360 / 5) * stamen + offset) * (Math.PI / 180);
    shapes.push({
      kind: "stroke",
      d: `M50 46 L${50 + Math.cos(angle) * 15} ${46 + Math.sin(angle) * 15}`,
      stroke: shade(tone.deep, -0.1),
      width: 1.4,
    });
    shapes.push({
      kind: "circle",
      cx: 50 + Math.cos(angle) * 16,
      cy: 46 + Math.sin(angle) * 16,
      r: 2.4,
      fill: "#B8873F",
    });
  }
  return shapes;
}

function ombelle(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [{ kind: "circle", cx: 50, cy: 46, r: 30, fill: tone.dark, opacity: 0.35 }];
  const florets = 16;
  for (let floret = 0; floret < florets; floret += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 26;
    const cx = 50 + Math.cos(angle) * radius;
    const cy = 46 + Math.sin(angle) * radius;
    const fill = floret % 3 === 0 ? tone.light : tone.base;
    for (let petal = 0; petal < 4; petal += 1) {
      shapes.push(petalEllipse(cx, cy, 3.6, petal * 90 + floret * 11, 3.4, 3, fill));
    }
    shapes.push({ kind: "circle", cx, cy, r: 1.5, fill: tone.heart });
  }
  return shapes;
}

function pompon(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const layers = [
    { count: 18, distance: 24, r: 6.5, fill: tone.dark },
    { count: 14, distance: 16, r: 5.5, fill: tone.base },
    { count: 9, distance: 8, r: 4.5, fill: tone.light },
  ];
  for (const [index, layer] of layers.entries()) {
    const offset = random() * 30 + index * 9;
    for (let bud = 0; bud < layer.count; bud += 1) {
      const angle = ((offset + (360 / layer.count) * bud) * Math.PI) / 180;
      shapes.push({
        kind: "circle",
        cx: 50 + Math.cos(angle) * layer.distance,
        cy: 46 + Math.sin(angle) * layer.distance,
        r: layer.r,
        fill: layer.fill,
      });
    }
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 5, fill: tone.heart });
  return shapes;
}

function epi(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const beads = 11;
  for (let bead = 0; bead < beads; bead += 1) {
    const progress = bead / (beads - 1);
    const cy = 16 + progress * 56;
    const width = 4 + Math.sin(progress * Math.PI) * 8;
    const drift = (random() - 0.5) * 3;
    shapes.push({
      kind: "ellipse",
      cx: 50 + drift,
      cy,
      rx: width,
      ry: 5.2,
      fill: bead % 2 === 0 ? tone.base : tone.dark,
      rotate: drift * 3,
    });
  }
  shapes.push({
    kind: "stroke",
    d: "M50 16 L50 78",
    stroke: shade(tone.deep, -0.2),
    width: 1.2,
    opacity: 0.5,
  });
  return shapes;
}

function feuillage(colors: readonly Color[], random: () => number): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [
    { kind: "stroke", d: "M50 88 C50 60 50 34 50 12", stroke: shade(tone.dark, -0.15), width: 2 },
  ];
  const pairs = 5;
  for (let pair = 0; pair < pairs; pair += 1) {
    const cy = 22 + pair * 13;
    const length = 15 + random() * 6;
    const tilt = 26 + random() * 12;
    shapes.push({
      kind: "ellipse",
      cx: 50 - length * 0.55,
      cy,
      rx: length * 0.6,
      ry: 5.5,
      fill: pair % 2 === 0 ? tone.base : tone.light,
      rotate: -tilt,
    });
    shapes.push({
      kind: "ellipse",
      cx: 50 + length * 0.55,
      cy: cy + 4,
      rx: length * 0.6,
      ry: 5.5,
      fill: pair % 2 === 0 ? tone.light : tone.base,
      rotate: tilt,
    });
  }
  return shapes;
}

const BUILDERS: Record<ShapeFamily, (colors: readonly Color[], random: () => number) => Shape[]> = {
  corolle,
  marguerite,
  coupe,
  trompette,
  ombelle,
  pompon,
  epi,
  feuillage,
};

/* ------------------------------------------------------------------- rendu */

export type FlowerArtInput = Pick<Flower, "id" | "category" | "colors" | "role">;

/** Deux décimales : le SVG n'a pas besoin de plus, et l'œil non plus. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Arrondit tous les nombres écrits dans un chemin SVG.
 *
 * Les chemins sont assemblés par interpolation de chaînes dans les
 * constructeurs ; les arrondir ici plutôt que dans chacun d'eux évite d'avoir
 * à y penser à chaque nouvelle forme.
 */
function roundPath(d: string): string {
  return d.replace(/-?\d+\.\d+/g, (match) => String(round(Number(match))));
}

/**
 * Arrondit les coordonnées d'une forme.
 *
 * Ce n'est pas qu'une question de propreté : un double comme
 * 60.668685544951714 ne se sérialise pas de la même façon au rendu serveur et
 * au rendu client, ce qui provoque une erreur d'hydratation React sur chaque
 * pétale. Arrondir à la source supprime la classe de bug entière, et allège
 * le HTML au passage.
 *
 * Toutes les variantes de `Shape` doivent être traitées : la première version
 * de cette fonction laissait passer les chemins, et le défaut est revenu par
 * les étamines des lys et des orchidées.
 */
function roundShape(shape: Shape): Shape {
  switch (shape.kind) {
    case "circle":
      return { ...shape, cx: round(shape.cx), cy: round(shape.cy), r: round(shape.r) };
    case "ellipse":
      return {
        ...shape,
        cx: round(shape.cx),
        cy: round(shape.cy),
        rx: round(shape.rx),
        ry: round(shape.ry),
        rotate: shape.rotate === undefined ? undefined : round(shape.rotate),
      };
    case "path":
      return { ...shape, d: roundPath(shape.d) };
    case "stroke":
      return { ...shape, d: roundPath(shape.d), width: round(shape.width) };
  }
}

export function buildFlowerArt(flower: FlowerArtInput, withStem = true): FlowerArt {
  const random = makeRandom(hashSeed(flower.id));
  const family = shapeFamily(flower.category, flower.role);
  const tone = palette(flower.colors);
  const head = BUILDERS[family](flower.colors, random);

  const shapes: Shape[] = [];
  if (withStem && family !== "feuillage") {
    // Arrondi volontaire : la courbe de tige est écrite telle quelle dans le
    // SVG, autant ne pas y transporter seize décimales.
    const bend = Math.round((random() - 0.5) * 140) / 10;
    shapes.push({
      kind: "stroke",
      d: `M50 74 C${50 + bend} 100 ${50 - bend} 128 50 158`,
      stroke: STEM_GREEN,
      width: 3,
    });
    shapes.push({
      kind: "ellipse",
      cx: 38,
      cy: 112,
      rx: 13,
      ry: 5,
      fill: LEAF_GREEN,
      rotate: -28,
    });
    shapes.push({
      kind: "ellipse",
      cx: 62,
      cy: 130,
      rx: 11,
      ry: 4.5,
      fill: shade(LEAF_GREEN, -0.12),
      rotate: 30,
    });
  }
  if (withStem && family === "feuillage") {
    shapes.push({
      kind: "stroke",
      d: "M50 74 C50 100 50 128 50 158",
      stroke: STEM_GREEN,
      width: 2.4,
    });
  }
  shapes.push(...head);

  return { viewBox: ART_VIEWBOX, shapes: shapes.map(roundShape), accent: tone.base };
}

/* -------------------------------------------------------------- sérialiseur */

function attr(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function shapeMarkup(shape: Shape): string {
  const opacity = "opacity" in shape && shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
  switch (shape.kind) {
    case "path":
      return `<path d="${shape.d}" fill="${shape.fill}"${opacity}/>`;
    case "circle":
      return `<circle cx="${attr(shape.cx)}" cy="${attr(shape.cy)}" r="${attr(shape.r)}" fill="${shape.fill}"${opacity}/>`;
    case "ellipse": {
      const transform =
        shape.rotate === undefined
          ? ""
          : ` transform="rotate(${attr(shape.rotate)} ${attr(shape.cx)} ${attr(shape.cy)})"`;
      return `<ellipse cx="${attr(shape.cx)}" cy="${attr(shape.cy)}" rx="${attr(shape.rx)}" ry="${attr(shape.ry)}" fill="${shape.fill}"${transform}${opacity}/>`;
    }
    case "stroke":
      return `<path d="${shape.d}" fill="none" stroke="${shape.stroke}" stroke-width="${shape.width}" stroke-linecap="round"${opacity}/>`;
  }
}

/** SVG complet et autonome, servi par /illustrations/[id].svg. */
export function flowerSvgMarkup(flower: FlowerArtInput, title: string): string {
  const art = buildFlowerArt(flower);
  const body = art.shapes.map(shapeMarkup).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}" width="200" height="320" role="img" aria-label="${title.replace(/"/g, "&quot;")}"><title>${title.replace(/</g, "&lt;")}</title><rect width="100" height="160" fill="#FAF7F2"/>${body}</svg>`;
}
