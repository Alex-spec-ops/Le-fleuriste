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
 * Les pétales sont de vraies courbes de Bézier, pas des ellipses : c'est ce
 * qui distingue une fleur d'un assemblage de ronds. La profondeur vient de
 * l'empilement — couronne extérieure sombre, cœur clair — plutôt que de
 * dégradés, qui imposeraient des <defs> et des identifiants uniques.
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

/**
 * Niveau de détail du dessin.
 *
 * « compact » divise le nombre de pétales et supprime les détails fins
 * (nervures, fleurons, anthères). Une vignette de catalogue fait 140 px :
 * personne n'y voit la nervure d'un tépale, mais 280 vignettes en plein
 * détail pèsent deux mégaoctets de HTML.
 */
export type ArtDetail = "full" | "compact";

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
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** `amount` positif éclaircit vers le blanc, négatif assombrit vers le noir. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  return rgbToHex([r + (target - r) * ratio, g + (target - g) * ratio, b + (target - b) * ratio]);
}

/** Mélange deux teintes, `ratio` = part de `b`. */
export function mix(a: string, b: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([r1 + (r2 - r1) * ratio, g1 + (g2 - g1) * ratio, b1 + (b2 - b1) * ratio]);
}

const STEM_GREEN = "#2C6B45";
const LEAF_GREEN = "#3E9E5C";
const STEM_SHADOW = "#1B5236";

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

/* ------------------------------------------------------------------ géométrie */

/** Deux décimales : au-delà, le serveur et le client ne s'accordent plus. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

type Point = { x: number; y: number };

function place(cx: number, cy: number, angleDeg: number, point: Point): Point {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: cx + point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: cy + point.x * Math.sin(angle) + point.y * Math.cos(angle),
  };
}

function xy(point: Point): string {
  return `${round(point.x)} ${round(point.y)}`;
}

/**
 * Un pétale : base au centre de la fleur, pointe à `length`.
 *
 * `width` est la demi-largeur au plus fort du renflement, `tipWidth` la
 * proportion de cette largeur conservée près de la pointe — c'est lui qui
 * fait la différence entre un pétale de rose (rond, 0,8) et un pétale de
 * gerbera (effilé, 0,25).
 */
function petalPath(
  cx: number,
  cy: number,
  angleDeg: number,
  length: number,
  width: number,
  tipWidth = 0.7,
): string {
  const at = (x: number, y: number) => place(cx, cy, angleDeg, { x, y });

  // Le bout est arrondi, jamais pointu : un pétale terminé en pointe donne
  // une fleur en étoile, ce qui ne ressemble à aucune fleur coupée.
  const apex = width * tipWidth * 0.55;

  const base = at(0, 0);
  const upNear = at(length * 0.14, -width);
  const upFar = at(length * 0.86, -width * tipWidth);
  const tipUp = at(length * 0.94, -apex);
  const tipCtrlUp = at(length * 1.02, -apex * 0.7);
  const tipCtrlDown = at(length * 1.02, apex * 0.7);
  const tipDown = at(length * 0.94, apex);
  const downFar = at(length * 0.86, width * tipWidth);
  const downNear = at(length * 0.14, width);

  return [
    `M${xy(base)}`,
    `C${xy(upNear)} ${xy(upFar)} ${xy(tipUp)}`,
    `C${xy(tipCtrlUp)} ${xy(tipCtrlDown)} ${xy(tipDown)}`,
    `C${xy(downFar)} ${xy(downNear)} ${xy(base)}`,
    "Z",
  ].join(" ");
}

/** Feuille : même tracé qu'un pétale, mais posée sur une tige et nervurée. */
function leafShapes(
  cx: number,
  cy: number,
  angleDeg: number,
  length: number,
  fill: string,
): Shape[] {
  const tipPoint = place(cx, cy, angleDeg, { x: length * 0.92, y: 0 });
  return [
    { kind: "path", d: petalPath(cx, cy, angleDeg, length, length * 0.3, 0.42), fill },
    {
      kind: "stroke",
      d: `M${xy({ x: cx, y: cy })} L${xy(tipPoint)}`,
      stroke: shade(fill, -0.22),
      width: 0.8,
      opacity: 0.7,
    },
  ];
}

/** Réduit un nombre de pétales pour le rendu compact. */
function compactCount(detail: ArtDetail, full: number): number {
  return detail === "compact" ? Math.max(5, Math.round(full * 0.62)) : full;
}

/* ------------------------------------------------------------- constructeurs */

type Palette = {
  base: string;
  light: string;
  pale: string;
  dark: string;
  deep: string;
  heart: string;
};

function palette(colors: readonly Color[]): Palette {
  const primary = COLOR_SWATCHES[colors[0]];
  const secondary = colors[1] ? COLOR_SWATCHES[colors[1]] : primary;
  const base = primary.fill;
  return {
    base,
    light: shade(base, 0.16),
    pale: shade(base, 0.32),
    dark: primary.stroke,
    deep: shade(primary.stroke, -0.15),
    heart: mix(base, secondary.fill, 0.55),
  };
}

/**
 * Corolle : rose, pivoine, renoncule.
 * Trois couronnes de pétales larges, de la plus sombre à l'extérieur vers la
 * plus claire au cœur, puis un bouton central enroulé.
 */
function corolle(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];

  const compact = detail === "compact";
  const rings = compact
    ? [
        { count: 7, length: 27, width: 17, fill: tone.dark, tip: 0.88 },
        { count: 6, length: 18, width: 13, fill: tone.base, tip: 0.86 },
      ]
    : [
        { count: 9, length: 28, width: 16, fill: tone.dark, tip: 0.88 },
        { count: 8, length: 21, width: 13, fill: tone.base, tip: 0.86 },
        { count: 6, length: 14, width: 10, fill: tone.light, tip: 0.84 },
      ];

  for (const [index, ring] of rings.entries()) {
    const offset = random() * 40 + index * 23;
    for (let petal = 0; petal < ring.count; petal += 1) {
      const angle = offset + (360 / ring.count) * petal;
      // Une variation de longueur par pétale : sans elle, la fleur est
      // parfaitement circulaire et ne ressemble plus à rien de vivant.
      const jitter = 0.9 + random() * 0.2;
      shapes.push({
        kind: "path",
        d: petalPath(50, 46, angle, ring.length * jitter, ring.width * jitter, ring.tip),
        fill: ring.fill,
      });
    }
  }

  // Cœur : trois pétales serrés en spirale, comme une rose qui s'ouvre.
  const heartOffset = random() * 360;
  for (let petal = 0; petal < (compact ? 1 : 3); petal += 1) {
    shapes.push({
      kind: "path",
      d: petalPath(50, 46, heartOffset + petal * 120, 9, 6, 0.85),
      fill: tone.pale,
    });
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 3.4, fill: shade(tone.heart, -0.15) });

  return shapes;
}

/**
 * Marguerite : gerbera, dahlia simple, fleur de champ.
 * Pétales longs et effilés sur deux rangs décalés, cœur en disque avec sa
 * couronne de fleurons.
 */
function marguerite(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];

  const outer = compactCount(detail, 13 + Math.floor(random() * 4));
  const offset = random() * 30;

  for (let petal = 0; petal < outer; petal += 1) {
    const angle = offset + (360 / outer) * petal;
    const jitter = 0.92 + random() * 0.16;
    shapes.push({
      kind: "path",
      d: petalPath(50, 46, angle, 32 * jitter, 6 * jitter, 0.3),
      fill: tone.dark,
    });
  }

  const inner = compactCount(detail, Math.max(9, outer - 3));
  for (let petal = 0; petal < inner; petal += 1) {
    const angle = offset + 180 / inner + (360 / inner) * petal;
    shapes.push({
      kind: "path",
      d: petalPath(50, 46, angle, 24, 5.2, 0.32),
      fill: tone.base,
    });
  }

  const disc = shade(tone.deep, -0.1);
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 9.5, fill: disc });
  // Couronne de fleurons : ce sont eux qui font lire « capitule » et non « rond ».
  for (let floret = 0; floret < (detail === "compact" ? 0 : 9); floret += 1) {
    const angle = ((360 / 9) * floret + offset) * (Math.PI / 180);
    shapes.push({
      kind: "circle",
      cx: 50 + Math.cos(angle) * 6.4,
      cy: 46 + Math.sin(angle) * 6.4,
      r: 1.7,
      fill: tone.heart,
      opacity: 0.85,
    });
  }
  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 3.2, fill: shade(disc, 0.25) });

  return shapes;
}

/**
 * Coupe : tulipe, bulbe de printemps.
 * Trois pétales galbés qui se referment, plus un liseré clair à l'intérieur.
 */
function coupe(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const lean = round((random() - 0.5) * 5);
  // La coupe ne coûte que quatre formes : en compact on retire seulement le
  // pétale arrière et le reflet, invisibles à la taille d'une vignette.
  const skip = detail === "compact";

  const shapes: Shape[] = [
    // Pétale arrière, à peine visible : il donne l'épaisseur de la coupe.
    {
      kind: "path",
      d: `M36 ${54 + lean} C32 30 41 17 50 15 C59 17 68 30 64 ${54 + lean} C58 64 42 64 36 ${54 + lean} Z`,
      fill: tone.dark,
    },
    {
      kind: "path",
      d: `M41 ${56 + lean} C38 34 44 21 50 19 C56 21 62 34 59 ${56 + lean} C55 63 45 63 41 ${56 + lean} Z`,
      fill: tone.base,
    },
  ];

  if (!skip) {
    shapes.unshift({
      kind: "path",
      d: `M34 ${52 + lean} C30 26 40 13 50 11 C60 13 70 26 66 ${52 + lean} C60 63 40 63 34 ${52 + lean} Z`,
      fill: tone.deep,
    });
    // Reflet central : la lumière glisse sur la nervure du pétale avant.
    shapes.push({
      kind: "path",
      d: `M47 ${54 + lean} C46 36 48 25 50 23 C52 25 54 36 53 ${54 + lean} C52 58 48 58 47 ${54 + lean} Z`,
      fill: tone.light,
      opacity: 0.75,
    });
  }

  return shapes;
}

/**
 * Trompette : lys, orchidée, fleur exotique.
 * Six tépales pointus, gorge sombre et étamines saillantes.
 */
function trompette(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];
  const offset = random() * 30;

  // Rang arrière décalé d'un demi-pas : la fleur gagne son épaisseur.
  for (let petal = 0; petal < 3; petal += 1) {
    const angle = offset + 60 + petal * 120;
    shapes.push({
      kind: "path",
      d: petalPath(50, 46, angle, 33, 10, 0.34),
      fill: tone.deep,
    });
  }
  for (let petal = 0; petal < 3; petal += 1) {
    const angle = offset + petal * 120;
    shapes.push({
      kind: "path",
      d: petalPath(50, 46, angle, 34, 11, 0.36),
      fill: tone.base,
    });
    // Nervure claire au centre du tépale.
    if (detail === "full")
      shapes.push({
      kind: "stroke",
      d: `M50 46 L${xy(place(50, 46, angle, { x: 28, y: 0 }))}`,
      stroke: tone.light,
      width: 1.6,
      opacity: 0.6,
    });
  }

  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 7.5, fill: shade(tone.deep, -0.12) });

  for (let stamen = 0; stamen < (detail === "compact" ? 0 : 5); stamen += 1) {
    const angle = ((360 / 5) * stamen + offset + 18) * (Math.PI / 180);
    const tipX = 50 + Math.cos(angle) * 17;
    const tipY = 46 + Math.sin(angle) * 17;
    shapes.push({
      kind: "stroke",
      d: `M50 46 L${round(tipX)} ${round(tipY)}`,
      stroke: shade(tone.deep, -0.1),
      width: 1.2,
    });
    shapes.push({ kind: "circle", cx: tipX, cy: tipY, r: 2.4, fill: "#FFB703" });
  }

  return shapes;
}

/**
 * Ombelle : hortensia.
 * Une masse de petits fleurons à quatre pétales, plus pâles vers le bord
 * pour que la tête ait du volume.
 */
function ombelle(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [{ kind: "circle", cx: 50, cy: 46, r: 29, fill: tone.deep, opacity: 0.3 }];

  const florets = detail === "compact" ? 7 : 15;
  for (let floret = 0; floret < florets; floret += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 25;
    const cx = 50 + Math.cos(angle) * radius;
    const cy = 46 + Math.sin(angle) * radius;
    // Les fleurons du bord sont plus sombres : la lumière vient du centre.
    const edge = radius / 25;
    const fill = edge > 0.66 ? tone.dark : edge > 0.33 ? tone.base : tone.light;
    const spin = floret * 23;

    for (let petal = 0; petal < 4; petal += 1) {
      shapes.push({
        kind: "path",
        d: petalPath(cx, cy, spin + petal * 90, 5.4, 3.1, 0.85),
        fill,
      });
    }
    if (detail === "full") {
      shapes.push({ kind: "circle", cx, cy, r: 1.2, fill: tone.heart, opacity: 0.9 });
    }
  }

  return shapes;
}

/**
 * Pompon : chrysanthème, œillet.
 * Des rangs de petits pétales courts et serrés, du bord vers le cœur.
 */
function pompon(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [];

  const layers =
    detail === "compact"
      ? [
          { count: 13, distance: 14, length: 12, width: 7, fill: tone.dark },
          { count: 9, distance: 6, length: 9.5, width: 6.2, fill: tone.base },
        ]
      : [
          { count: 16, distance: 20, length: 11, width: 4.4, fill: tone.dark },
          { count: 13, distance: 13, length: 9, width: 4, fill: tone.base },
          { count: 9, distance: 6, length: 7.5, width: 3.6, fill: tone.light },
        ];

  for (const [index, layer] of layers.entries()) {
    const offset = random() * 30 + index * 11;
    for (let petal = 0; petal < layer.count; petal += 1) {
      const angle = offset + (360 / layer.count) * petal;
      const anchor = place(50, 46, angle, { x: layer.distance, y: 0 });
      shapes.push({
        kind: "path",
        d: petalPath(anchor.x, anchor.y, angle, layer.length, layer.width, 0.7),
        fill: layer.fill,
      });
    }
  }

  shapes.push({ kind: "circle", cx: 50, cy: 46, r: 4.6, fill: tone.pale });
  return shapes;
}

/**
 * Épi : graminée, lavande, fleur séchée.
 * Des fleurons alternés le long d'un axe, serrés en haut, ouverts en bas.
 */
function epi(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [
    {
      kind: "stroke",
      d: "M50 14 C51 34 49 56 50 80",
      stroke: shade(tone.deep, -0.2),
      width: 1.4,
      opacity: 0.75,
    },
  ];

  const beads = detail === "compact" ? 8 : 13;
  for (let bead = 0; bead < beads; bead += 1) {
    const progress = bead / (beads - 1);
    const cy = 16 + progress * 60;
    const side = bead % 2 === 0 ? 1 : -1;
    const length = 5 + Math.sin(progress * Math.PI) * 7;
    const spread = 26 + random() * 16;

    shapes.push({
      kind: "path",
      d: petalPath(50, cy, side * spread, length, length * 0.42, 0.6),
      fill: bead % 3 === 0 ? tone.dark : tone.base,
    });
    if (detail === "full") {
      shapes.push({
        kind: "path",
        d: petalPath(50, cy + 2, side * -spread * 0.6, length * 0.7, length * 0.34, 0.6),
        fill: tone.light,
        opacity: 0.85,
      });
    }
  }

  return shapes;
}

/** Feuillage : une tige et des feuilles alternées, nervurées. */
function feuillage(colors: readonly Color[], random: () => number, detail: ArtDetail): Shape[] {
  const tone = palette(colors);
  const shapes: Shape[] = [
    {
      kind: "stroke",
      d: "M50 88 C51 62 49 36 50 12",
      stroke: shade(tone.dark, -0.15),
      width: 2,
    },
  ];

  const pairs = detail === "compact" ? 3 : 5;
  for (let pair = 0; pair < pairs; pair += 1) {
    const cy = 22 + pair * 13;
    const length = 17 + random() * 5;
    const tilt = 30 + random() * 12;
    shapes.push(
      ...leafShapes(50, cy, 180 - tilt, length, pair % 2 === 0 ? tone.base : tone.light),
      ...leafShapes(50, cy + 4, tilt, length, pair % 2 === 0 ? tone.light : tone.base),
    );
  }

  return shapes;
}

const BUILDERS: Record<
  ShapeFamily,
  (colors: readonly Color[], random: () => number, detail: ArtDetail) => Shape[]
> = {
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
 * pétale. Arrondir à la source supprime la classe de bug entière.
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

export function buildFlowerArt(
  flower: FlowerArtInput,
  withStem = true,
  detail: ArtDetail = "full",
): FlowerArt {
  const random = makeRandom(hashSeed(flower.id));
  const family = shapeFamily(flower.category, flower.role);
  const tone = palette(flower.colors);
  const head = BUILDERS[family](flower.colors, random, detail);

  const shapes: Shape[] = [];

  if (withStem && family !== "feuillage") {
    // Arrondi volontaire : la courbe de tige est écrite telle quelle dans le
    // SVG, autant ne pas y transporter seize décimales.
    const bend = Math.round((random() - 0.5) * 140) / 10;
    const path = `M50 74 C${50 + bend} 100 ${50 - bend} 128 50 158`;

    // Deux traits superposés : le plus large et le plus sombre fait l'ombre
    // du côté opposé à la courbure, ce qui donne du volume à la tige.
    shapes.push({ kind: "stroke", d: path, stroke: STEM_SHADOW, width: 3.6 });
    shapes.push({ kind: "stroke", d: path, stroke: STEM_GREEN, width: 2.4 });

    shapes.push(...leafShapes(46, 112, 208, 17, LEAF_GREEN));
    shapes.push(...leafShapes(54, 132, -28, 14, shade(LEAF_GREEN, -0.12)));
  }

  if (withStem && family === "feuillage") {
    shapes.push({ kind: "stroke", d: "M50 74 C50 100 50 128 50 158", stroke: STEM_GREEN, width: 2.4 });
  }

  shapes.push(...head);

  return { viewBox: ART_VIEWBOX, shapes: shapes.map(roundShape), accent: tone.base };
}

/* -------------------------------------------------------------- sérialiseur */

function attr(value: number): string {
  return String(round(value));
}

function shapeMarkup(shape: Shape): string {
  const opacity =
    "opacity" in shape && shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : "";
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}" width="200" height="320" role="img" aria-label="${title.replace(/"/g, "&quot;")}"><title>${title.replace(/</g, "&lt;")}</title><rect width="100" height="160" fill="#FFF7EC"/>${body}</svg>`;
}
