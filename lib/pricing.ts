import type {
  BouquetSize,
  Category,
  DeliveryMode,
  Season,
  Style,
  Wrapping,
} from "@/lib/constants";
import type { Flower } from "@/lib/schemas/flower";

/**
 * Moteur de prix unique du site.
 *
 * Le simulateur du composeur (features 3 et 4) et le devis événementiel
 * (feature 1) appellent tous les deux ces fonctions : une même composition
 * donne exactement le même prix dans les deux modules, ce que vérifient les
 * tests de tests/pricing.test.ts.
 *
 * Convention de TVA — écart assumé au cahier des charges : le catalogue donne
 * des prix « TTC par tige » (§ 2.1). Les additionner puis leur ajouter 20 %
 * taxerait deux fois. Tous les montants manipulés ici sont donc TTC, et la
 * ligne de TVA affichée est la part de taxe *incluse* dans le total
 * (total × 20 / 120), signalée « dont TVA ».
 */

export const VAT_RATE = 0.2;

/** Part de TVA contenue dans un montant TTC. */
export function vatIncludedIn(amountTtc: number): number {
  return round2((amountTtc * VAT_RATE) / (1 + VAT_RATE));
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

/* ------------------------------------------------------------- coefficients */

/** Majoration appliquée à une fleur importée hors de sa saison (§ 3). */
export const OFF_SEASON_COEFFICIENT_DEFAULT = 1.45;

/** Catégories dont l'import hors saison coûte nettement plus cher. */
const OFF_SEASON_COEFFICIENT_BY_CATEGORY: Partial<Record<Category, number>> = {
  Pivoines: 1.8,
  Hortensias: 1.65,
  Renoncules: 1.6,
  Dahlias: 1.75,
  Orchidées: 1.4,
};

export const STYLE_COEFFICIENT: Readonly<Record<Style, number>> = {
  minimaliste: 1.0,
  moderne: 1.05,
  champêtre: 1.1,
  pastel: 1.12,
  romantique: 1.15,
  sauvage: 1.2,
  luxuriant: 1.35,
};

/** Multiplicateur appliqué aux quantités de tiges. */
export const SIZE_MULTIPLIER: Readonly<Record<BouquetSize, number>> = {
  petit: 0.7,
  moyen: 1,
  grand: 1.4,
  généreux: 1.9,
};

export const WRAPPING_PRICE: Readonly<Record<Wrapping, number>> = {
  "kraft simple": 0,
  "papier de soie": 2.5,
  "boîte chapeau": 12,
  "vase inclus": 16,
};

/**
 * Barème de livraison (standard français retenu avec la boutique).
 * La livraison locale est offerte au-delà de FREE_LOCAL_DELIVERY_FROM.
 */
export const DELIVERY_PRICE: Readonly<Record<DeliveryMode, number>> = {
  "retrait boutique": 0,
  locale: 8,
  départementale: 15,
  "express jour même": 25,
};

export const FREE_LOCAL_DELIVERY_FROM = 80;

export const HANDWRITTEN_CARD_PRICE = 2.5;
export const CUSTOM_RIBBON_PRICE = 3.5;

/** Main-d'œuvre d'un bouquet à la main : forfait de montage + temps par tige. */
export const BOUQUET_LABOUR = { base: 9, perStem: 0.3 } as const;

/* ------------------------------------------------------------- saisonnalité */

export type Availability = "en saison" | "import" | "indisponible";

export type PriceableFlower = Pick<
  Flower,
  "id" | "nameFr" | "unit" | "pricePerStem" | "season" | "offSeasonImport" | "category"
>;

export function availabilityOf(flower: PriceableFlower, season: Season): Availability {
  if (flower.season.includes("toute l'année") || flower.season.includes(season)) return "en saison";
  return flower.offSeasonImport ? "import" : "indisponible";
}

/**
 * Coefficient saisonnier. Une fleur hors saison et non importable est facturée
 * au coefficient d'import maximal : le devis reste chiffré, mais la ligne est
 * signalée comme indisponible à la date demandée.
 */
export function seasonCoefficient(flower: PriceableFlower, season: Season): number {
  const availability = availabilityOf(flower, season);
  if (availability === "en saison") return 1;
  return OFF_SEASON_COEFFICIENT_BY_CATEGORY[flower.category] ?? OFF_SEASON_COEFFICIENT_DEFAULT;
}

/* ------------------------------------------------------------------ bouquet */

export type BouquetItem = { flower: PriceableFlower; quantity: number };

export type BouquetOptions = {
  size: BouquetSize;
  wrapping: Wrapping;
  delivery: DeliveryMode;
  style: Style;
  handwrittenCard: boolean;
  customRibbon: boolean;
  /** Saison de référence : celle de la date de retrait ou de livraison. */
  season: Season;
};

export type PricedLine = {
  flowerId: string;
  nameFr: string;
  unit: Flower["unit"];
  /** Quantité demandée, avant multiplicateur de taille. */
  requestedQuantity: number;
  /** Quantité réellement facturée. */
  quantity: number;
  unitPrice: number;
  seasonCoefficient: number;
  availability: Availability;
  /** Part de la ligne due au surcoût d'import. */
  offSeasonSurcharge: number;
  total: number;
};

export type ExtraLine = { label: string; amount: number };

export type BouquetQuote = {
  lines: PricedLine[];
  stemCount: number;
  /** Fleurs, coefficients de saison et de style compris. */
  flowersTotal: number;
  styleCoefficient: number;
  offSeasonSurcharge: number;
  labour: number;
  wrapping: ExtraLine;
  extras: ExtraLine[];
  delivery: ExtraLine;
  total: number;
  vatIncluded: number;
  warnings: string[];
};

export function priceBouquet(
  items: readonly BouquetItem[],
  options: BouquetOptions,
): BouquetQuote {
  const sizeMultiplier = SIZE_MULTIPLIER[options.size];
  const styleFactor = STYLE_COEFFICIENT[options.style];
  const warnings: string[] = [];

  const lines: PricedLine[] = items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const quantity = Math.max(1, Math.round(item.quantity * sizeMultiplier));
      const coefficient = seasonCoefficient(item.flower, options.season);
      const availability = availabilityOf(item.flower, options.season);
      const base = round2(quantity * item.flower.pricePerStem);
      const total = round2(base * coefficient);

      if (availability === "indisponible") {
        warnings.push(
          `${item.flower.nameFr} n'est pas disponible en ${options.season} : à confirmer avec la boutique.`,
        );
      }

      return {
        flowerId: item.flower.id,
        nameFr: item.flower.nameFr,
        unit: item.flower.unit,
        requestedQuantity: item.quantity,
        quantity,
        unitPrice: item.flower.pricePerStem,
        seasonCoefficient: coefficient,
        availability,
        offSeasonSurcharge: round2(total - base),
        total,
      };
    });

  const stemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const flowersBeforeStyle = round2(lines.reduce((sum, line) => sum + line.total, 0));
  const flowersTotal = round2(flowersBeforeStyle * styleFactor);
  const offSeasonSurcharge = round2(
    lines.reduce((sum, line) => sum + line.offSeasonSurcharge, 0) * styleFactor,
  );

  const labour = stemCount === 0 ? 0 : round2(BOUQUET_LABOUR.base + stemCount * BOUQUET_LABOUR.perStem);
  const wrapping: ExtraLine = {
    label: `Emballage — ${options.wrapping}`,
    amount: WRAPPING_PRICE[options.wrapping],
  };

  const extras: ExtraLine[] = [];
  if (options.handwrittenCard) {
    extras.push({ label: "Carte manuscrite", amount: HANDWRITTEN_CARD_PRICE });
  }
  if (options.customRibbon) {
    extras.push({ label: "Ruban personnalisé", amount: CUSTOM_RIBBON_PRICE });
  }

  const beforeDelivery = round2(
    flowersTotal + labour + wrapping.amount + extras.reduce((sum, extra) => sum + extra.amount, 0),
  );

  let deliveryAmount = DELIVERY_PRICE[options.delivery];
  let deliveryLabel = `Livraison — ${options.delivery}`;
  if (options.delivery === "locale" && beforeDelivery >= FREE_LOCAL_DELIVERY_FROM) {
    deliveryAmount = 0;
    deliveryLabel = `Livraison locale offerte dès ${FREE_LOCAL_DELIVERY_FROM} €`;
  }

  const total = round2(beforeDelivery + deliveryAmount);

  return {
    lines,
    stemCount,
    flowersTotal,
    styleCoefficient: styleFactor,
    offSeasonSurcharge,
    labour,
    wrapping,
    extras,
    delivery: { label: deliveryLabel, amount: deliveryAmount },
    total,
    vatIncluded: vatIncludedIn(total),
    warnings: [...new Set(warnings)],
  };
}

/* ------------------------------------------------------------ pièces florales */

export const EVENT_PIECES = [
  { id: "bouquet-mariee", label: "Bouquet de la mariée", labour: 45, defaultStems: 24 },
  { id: "bouquet-demoiselle", label: "Bouquet de demoiselle d'honneur", labour: 22, defaultStems: 12 },
  { id: "boutonniere", label: "Boutonnière", labour: 6, defaultStems: 3 },
  { id: "centre-table-bas", label: "Centre de table bas", labour: 18, defaultStems: 15 },
  { id: "centre-table-haut", label: "Centre de table haut", labour: 32, defaultStems: 28 },
  { id: "arche", label: "Arche florale", labour: 180, defaultStems: 120 },
  { id: "chemin-table", label: "Chemin de table (le mètre)", labour: 40, defaultStems: 30 },
  { id: "decor-ceremonie", label: "Décor de cérémonie", labour: 90, defaultStems: 60 },
  { id: "composition-accueil", label: "Composition d'accueil", labour: 35, defaultStems: 22 },
  { id: "fleurs-voiture", label: "Fleurs de voiture", labour: 30, defaultStems: 18 },
  { id: "petales", label: "Pétales (le sachet)", labour: 4, defaultStems: 6 },
] as const;

export type EventPieceId = (typeof EVENT_PIECES)[number]["id"];

export function eventPiece(id: EventPieceId) {
  const piece = EVENT_PIECES.find((candidate) => candidate.id === id);
  if (!piece) throw new Error(`Pièce florale inconnue : ${id}`);
  return piece;
}

export type EventPieceRequest = {
  pieceId: EventPieceId;
  quantity: number;
  /** Composition d'une unité de la pièce. */
  composition: readonly BouquetItem[];
};

export type PricedEventPiece = {
  pieceId: EventPieceId;
  label: string;
  quantity: number;
  lines: PricedLine[];
  /** Coût des fleurs d'une seule pièce, coefficient de style compris. */
  flowersPerUnit: number;
  labourPerUnit: number;
  unitTotal: number;
  total: number;
};

/**
 * prixPièce = Σ(tiges × prixTige × coeffSaison) × coeffStyle + main-d'œuvre
 * Exactement la formule du § 3 du cahier des charges.
 */
export function priceEventPiece(
  request: EventPieceRequest,
  options: { season: Season; style: Style },
): PricedEventPiece {
  const piece = eventPiece(request.pieceId);
  const styleFactor = STYLE_COEFFICIENT[options.style];

  const lines: PricedLine[] = request.composition
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const coefficient = seasonCoefficient(item.flower, options.season);
      const base = round2(item.quantity * item.flower.pricePerStem);
      const total = round2(base * coefficient);
      return {
        flowerId: item.flower.id,
        nameFr: item.flower.nameFr,
        unit: item.flower.unit,
        requestedQuantity: item.quantity,
        quantity: item.quantity,
        unitPrice: item.flower.pricePerStem,
        seasonCoefficient: coefficient,
        availability: availabilityOf(item.flower, options.season),
        offSeasonSurcharge: round2(total - base),
        total,
      };
    });

  const flowersPerUnit = round2(
    lines.reduce((sum, line) => sum + line.total, 0) * styleFactor,
  );
  const unitTotal = round2(flowersPerUnit + piece.labour);

  return {
    pieceId: piece.id,
    label: piece.label,
    quantity: request.quantity,
    lines,
    flowersPerUnit,
    labourPerUnit: piece.labour,
    unitTotal,
    total: round2(unitTotal * request.quantity),
  };
}

/* -------------------------------------------------------------------- devis */

/** Forfait de déplacement et de livraison sur le lieu de l'événement. */
export const EVENT_DELIVERY_BASE = 60;
/** Installation sur place : part du montant fleurs + main-d'œuvre. */
export const EVENT_INSTALLATION_RATE = 0.12;
export const EVENT_INSTALLATION_MINIMUM = 80;
/** Pièces qui imposent une installation minimale sur site. */
const HEAVY_PIECES: readonly EventPieceId[] = ["arche", "decor-ceremonie", "chemin-table"];

/** Fourchette affichée au client, plutôt qu'un chiffre unique. */
export const QUOTE_RANGE = { low: 0.88, high: 1.18 } as const;

export type EventQuote = {
  pieces: PricedEventPiece[];
  flowersTotal: number;
  labourTotal: number;
  offSeasonSurcharge: number;
  delivery: number;
  installation: number;
  total: number;
  vatIncluded: number;
  range: { low: number; recommended: number; high: number };
  warnings: string[];
};

export function priceEventQuote(
  requests: readonly EventPieceRequest[],
  options: { season: Season; style: Style; delivery?: boolean; installation?: boolean },
): EventQuote {
  const pieces = requests
    .filter((request) => request.quantity > 0 && request.composition.length > 0)
    .map((request) => priceEventPiece(request, options));

  const flowersTotal = round2(
    pieces.reduce((sum, piece) => sum + piece.flowersPerUnit * piece.quantity, 0),
  );
  const labourTotal = round2(
    pieces.reduce((sum, piece) => sum + piece.labourPerUnit * piece.quantity, 0),
  );
  const offSeasonSurcharge = round2(
    pieces.reduce(
      (sum, piece) =>
        sum +
        piece.lines.reduce((lineSum, line) => lineSum + line.offSeasonSurcharge, 0) *
          STYLE_COEFFICIENT[options.style] *
          piece.quantity,
      0,
    ),
  );

  const needsInstallation =
    options.installation ?? pieces.some((piece) => HEAVY_PIECES.includes(piece.pieceId));
  const delivery = pieces.length === 0 || options.delivery === false ? 0 : EVENT_DELIVERY_BASE;
  const installation = needsInstallation
    ? Math.max(EVENT_INSTALLATION_MINIMUM, round2((flowersTotal + labourTotal) * EVENT_INSTALLATION_RATE))
    : 0;

  const total = round2(flowersTotal + labourTotal + delivery + installation);

  const warnings = [
    ...new Set(
      pieces.flatMap((piece) =>
        piece.lines
          .filter((line) => line.availability !== "en saison")
          .map((line) =>
            line.availability === "indisponible"
              ? `${line.nameFr} n'est pas disponible à cette période : une substitution sera proposée.`
              : `${line.nameFr} sera importée hors saison (majoration ×${line.seasonCoefficient}).`,
          ),
      ),
    ),
  ];

  return {
    pieces,
    flowersTotal,
    labourTotal,
    offSeasonSurcharge,
    delivery,
    installation,
    total,
    vatIncluded: vatIncludedIn(total),
    range: {
      low: round2(total * QUOTE_RANGE.low),
      recommended: total,
      high: round2(total * QUOTE_RANGE.high),
    },
    warnings,
  };
}

/* ------------------------------------------------------- ajustement au budget */

export type Substitution = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  savingPerStem: number;
  savingPercent: number;
  reason: string;
};

/**
 * Cherche, pour chaque fleur trop chère, la plus proche moins chère :
 * même rôle, même famille de couleur, prix inférieur d'au moins 15 %.
 */
export type SubstitutableFlower = Pick<
  Flower,
  "id" | "nameFr" | "role" | "colors" | "pricePerStem"
>;

export function findSubstitution<T extends SubstitutableFlower>(
  flower: SubstitutableFlower,
  candidates: readonly T[],
): Substitution | null {
  const cheaper = candidates
    .filter(
      (candidate) =>
        candidate.id !== flower.id &&
        candidate.role === flower.role &&
        candidate.colors.some((color) => flower.colors.includes(color)) &&
        candidate.pricePerStem <= flower.pricePerStem * 0.85,
    )
    .sort((a, b) => b.pricePerStem - a.pricePerStem);

  const best = cheaper[0];
  if (!best) return null;

  const savingPerStem = round2(flower.pricePerStem - best.pricePerStem);
  const savingPercent = Math.round((savingPerStem / flower.pricePerStem) * 100);
  return {
    fromId: flower.id,
    fromName: flower.nameFr,
    toId: best.id,
    toName: best.nameFr,
    savingPerStem,
    savingPercent,
    reason: `${flower.nameFr} → ${best.nameFr}, −${savingPercent} %, même rôle et couleur proche.`,
  };
}
