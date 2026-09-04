import {
  seasonForDate,
  type Color,
  type EventType,
  type Occasion,
  type Role,
  type Season,
} from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";
import {
  availabilityOf,
  findSubstitution,
  priceEventQuote,
  type EventPieceId,
  type EventQuote,
  type EventPieceRequest,
} from "@/lib/pricing";
import type { QuoteForm } from "@/lib/schemas/quote";

/**
 * Construction automatique d'un devis événementiel.
 *
 * L'outil choisit les fleurs comme le ferait le fleuriste : la palette
 * d'abord, la saison ensuite, puis l'occasion, en écartant ce que le client
 * a exclu et en tenant compte des allergies et des animaux.
 */

/** Occasion du catalogue correspondant au type d'événement. */
export const OCCASION_BY_EVENT: Readonly<Record<EventType, Occasion>> = {
  mariage: "mariage",
  baptême: "naissance",
  anniversaire: "anniversaire",
  "séminaire / entreprise": "entreprise",
  funérailles: "condoléances",
  autre: "félicitations",
};

/** Répartition des tiges par rôle, selon la pièce florale. */
const ROLE_MIX: Record<EventPieceId, Partial<Record<Role, number>>> = {
  "bouquet-mariee": { focale: 0.42, secondaire: 0.28, remplissage: 0.18, feuillage: 0.12 },
  "bouquet-demoiselle": { focale: 0.4, secondaire: 0.3, remplissage: 0.2, feuillage: 0.1 },
  boutonniere: { focale: 0.5, remplissage: 0.25, feuillage: 0.25 },
  "centre-table-bas": { focale: 0.35, secondaire: 0.3, remplissage: 0.2, feuillage: 0.15 },
  "centre-table-haut": { focale: 0.3, secondaire: 0.28, structure: 0.2, feuillage: 0.22 },
  arche: { structure: 0.3, feuillage: 0.32, focale: 0.22, secondaire: 0.16 },
  "chemin-table": { feuillage: 0.35, remplissage: 0.25, secondaire: 0.22, focale: 0.18 },
  "decor-ceremonie": { focale: 0.28, secondaire: 0.25, structure: 0.22, feuillage: 0.25 },
  "composition-accueil": { focale: 0.34, secondaire: 0.28, remplissage: 0.2, feuillage: 0.18 },
  "fleurs-voiture": { focale: 0.45, secondaire: 0.3, feuillage: 0.25 },
  petales: { focale: 1 },
};

/** Nombre de variétés retenues par rôle, pour éviter les compositions confuses. */
const VARIETIES_PER_ROLE: Partial<Record<Role, number>> = {
  focale: 2,
  secondaire: 2,
  remplissage: 1,
  feuillage: 1,
  structure: 1,
};

/** Le catalogue peut ne pas couvrir un rôle : on se rabat sur le plus proche. */
const ROLE_FALLBACK: Record<Role, Role[]> = {
  focale: ["focale", "secondaire"],
  secondaire: ["secondaire", "focale", "remplissage"],
  remplissage: ["remplissage", "secondaire", "feuillage"],
  feuillage: ["feuillage", "structure", "remplissage"],
  structure: ["structure", "feuillage", "focale"],
};

function scoreFlower(
  flower: FlowerLite,
  form: QuoteForm,
  season: Season,
  occasion: Occasion,
): number {
  if (form.constraints.excludedFlowerIds.includes(flower.id)) return Number.NEGATIVE_INFINITY;

  let score = 0;
  if (form.constraints.requiredFlowerIds.includes(flower.id)) score += 20;

  const paletteHits = flower.colors.filter((color) => form.palette.includes(color)).length;
  score += paletteHits * 5;
  if (paletteHits === 0 && flower.colors.includes("vert")) score += 1.5;

  const availability = availabilityOf(flower, season);
  if (availability === "en saison") score += 4;
  else if (availability === "import") score -= 1.5;
  else score -= 6;

  if (flower.occasions.includes(occasion)) score += 3;

  if (form.constraints.allergies) {
    if (flower.allergenRisk === "élevé") score -= 8;
    else if (flower.allergenRisk === "moyen") score -= 2;
    else score += 1;
  }
  if (form.constraints.pets && flower.toxicPets) score -= 8;

  if (form.eventType === "funérailles" && flower.colors.some((c) => isLoud(c))) score -= 4;

  return score;
}

function isLoud(color: Color): boolean {
  return color === "fuchsia" || color === "orange" || color === "rose vif";
}

function pickByRole(
  catalog: readonly FlowerLite[],
  role: Role,
  count: number,
  form: QuoteForm,
  season: Season,
  occasion: Occasion,
): FlowerLite[] {
  for (const candidateRole of ROLE_FALLBACK[role]) {
    const ranked = catalog
      .filter((flower) => flower.role === candidateRole && flower.unit !== "pot")
      .map((flower) => ({ flower, score: scoreFlower(flower, form, season, occasion) }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score || a.flower.id.localeCompare(b.flower.id));
    if (ranked.length > 0) {
      return ranked.slice(0, count).map((entry) => entry.flower);
    }
  }
  return [];
}

export type BuiltPiece = EventPieceRequest & { stems: number };

export function buildComposition(
  pieceId: EventPieceId,
  stems: number,
  catalog: readonly FlowerLite[],
  form: QuoteForm,
  season: Season,
): { flower: FlowerLite; quantity: number }[] {
  const occasion = OCCASION_BY_EVENT[form.eventType];
  const mix = ROLE_MIX[pieceId];
  const composition: { flower: FlowerLite; quantity: number }[] = [];

  for (const [role, share] of Object.entries(mix) as [Role, number][]) {
    const budgetStems = Math.max(1, Math.round(stems * share));
    const varieties = pickByRole(
      catalog,
      role,
      VARIETIES_PER_ROLE[role] ?? 1,
      form,
      season,
      occasion,
    );
    if (varieties.length === 0) continue;

    const perVariety = Math.max(1, Math.floor(budgetStems / varieties.length));
    let remaining = budgetStems;
    varieties.forEach((flower, index) => {
      const quantity =
        index === varieties.length - 1 ? Math.max(1, remaining) : Math.min(perVariety, remaining);
      remaining -= quantity;
      const existing = composition.find((entry) => entry.flower.id === flower.id);
      if (existing) existing.quantity += quantity;
      else composition.push({ flower, quantity });
    });
  }

  return composition;
}

export type BudgetNote = { message: string };

export type BuiltQuote = {
  season: Season;
  requests: EventPieceRequest[];
  quote: EventQuote;
  adjustments: string[];
};

/** Nombre de centres de table conseillé, huit convives par table. */
export function suggestedTableCount(guests: number): number {
  return Math.max(1, Math.ceil(guests / 8));
}

export function buildQuote(form: QuoteForm, catalog: readonly FlowerLite[]): BuiltQuote {
  const season = form.date ? seasonForDate(new Date(form.date)) : seasonForDate(new Date());
  const adjustments: string[] = [];

  let requests: EventPieceRequest[] = (
    Object.entries(form.pieces) as [EventPieceId, number][]
  )
    .filter(([, quantity]) => quantity > 0)
    .map(([pieceId, quantity]) => {
      const defaultStems =
        (
          {
            "bouquet-mariee": 24,
            "bouquet-demoiselle": 12,
            boutonniere: 3,
            "centre-table-bas": 15,
            "centre-table-haut": 28,
            arche: 120,
            "chemin-table": 30,
            "decor-ceremonie": 60,
            "composition-accueil": 22,
            "fleurs-voiture": 18,
            petales: 6,
          } as Record<EventPieceId, number>
        )[pieceId] ?? 15;

      return {
        pieceId,
        quantity,
        composition: buildComposition(pieceId, defaultStems, catalog, form, season),
      };
    });

  let quote = priceEventQuote(requests, { season, style: form.style });

  // Ajustement au budget : substitutions d'abord, quantités ensuite.
  const substituted = new Set<string>();
  for (let step = 0; step < 12 && quote.total > form.budget; step += 1) {
    const heaviest = requests
      .flatMap((request) =>
        request.composition.map((item) => ({
          request,
          item,
          weight: item.flower.pricePerStem * item.quantity * request.quantity,
        })),
      )
      .filter(
        (entry) =>
          !substituted.has(entry.item.flower.id) &&
          !form.constraints.requiredFlowerIds.includes(entry.item.flower.id),
      )
      .sort((a, b) => b.weight - a.weight)[0];

    if (!heaviest) break;
    const substitution = findSubstitution(heaviest.item.flower, catalog);
    if (!substitution) {
      substituted.add(heaviest.item.flower.id);
      continue;
    }

    const replacement = catalog.find((flower) => flower.id === substitution.toId);
    if (!replacement) break;

    substituted.add(heaviest.item.flower.id);
    substituted.add(replacement.id);
    requests = requests.map((request) => ({
      ...request,
      composition: request.composition.map((item) =>
        item.flower.id === heaviest.item.flower.id ? { ...item, flower: replacement } : item,
      ),
    }));
    adjustments.push(substitution.reason);
    quote = priceEventQuote(requests, { season, style: form.style });
  }

  if (quote.total > form.budget) {
    const ratio = Math.max(0.45, form.budget / quote.total);
    requests = requests.map((request) => ({
      ...request,
      composition: request.composition.map((item) => ({
        ...item,
        quantity: Math.max(1, Math.round(item.quantity * ratio)),
      })),
    }));
    quote = priceEventQuote(requests, { season, style: form.style });
    adjustments.push(
      `Densité des compositions réduite d'environ ${Math.round((1 - ratio) * 100)} % pour tenir l'enveloppe.`,
    );
  }

  return { season, requests, quote, adjustments };
}
