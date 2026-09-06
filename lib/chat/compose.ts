import { seasonForDate, type Color, type Occasion } from "@/lib/constants";
import { getAllFlowers } from "@/lib/flowers";
import type { Flower } from "@/lib/schemas/flower";
import { priceBouquet, type BouquetOptions } from "@/lib/pricing";

/**
 * Composition d'une proposition chiffrée à partir du catalogue.
 *
 * Ce module est la seule façon de fabriquer une suggestion : l'outil
 * `buildBouquetSuggestion` offert au modèle et le conseiller local
 * l'appellent tous les deux, donc une recommandation donne le même bouquet et
 * le même prix quelle que soit la voie empruntée.
 */

export type ComposeRequest = {
  occasion: Occasion;
  /** Budget cible en euros TTC. */
  budget: number;
  palette?: readonly Color[];
  petSafe?: boolean;
  excludeAllergens?: boolean;
  fragrantOnly?: boolean;
  /** Décale le choix des fleurs, pour proposer plusieurs options distinctes. */
  variant?: number;
  /** Fleurs à ne pas retenir (déjà proposées dans une autre option). */
  exclude?: readonly string[];
};

export type ComposedBouquet = {
  items: Record<string, number>;
  lines: { flower: Flower; quantity: number }[];
  total: number;
  stemCount: number;
};

const BASE_OPTIONS: Omit<BouquetOptions, "season"> = {
  size: "moyen",
  wrapping: "kraft simple",
  delivery: "retrait boutique",
  style: "champêtre",
  handwrittenCard: false,
  customRibbon: false,
};

/**
 * Proportions par rôle dans un bouquet du quotidien : part des tiges, et part
 * du budget qu'il est raisonnable d'y consacrer. Le feuillage et le
 * remplissage occupent beaucoup de place pour peu d'argent, la fleur focale
 * l'inverse.
 */
const ROLE_SHARE: readonly {
  role: Flower["role"];
  share: number;
  budgetShare: number;
}[] = [
  { role: "focale", share: 0.45, budgetShare: 0.55 },
  { role: "secondaire", share: 0.32, budgetShare: 0.3 },
  { role: "remplissage", share: 0.23, budgetShare: 0.15 },
];

/** Taille de référence d'un bouquet, pour estimer un prix à la tige tenable. */
const REFERENCE_STEMS = 14;

/**
 * `matchOccasion` est relâché pour les rôles d'accompagnement : une verdure
 * ou une fleur de remplissage n'appartient à aucune occasion en particulier,
 * et l'exiger laisserait des bouquets sans liant — le catalogue ne référence
 * aucun santini « romantique », par exemple.
 */
function eligible(
  request: ComposeRequest,
  season: ReturnType<typeof seasonForDate>,
  matchOccasion: boolean,
) {
  return getAllFlowers().filter((flower) => {
    if (flower.unit === "pot") return false;
    if (request.exclude?.includes(flower.id)) return false;
    if (request.petSafe && flower.toxicPets) return false;
    if (request.excludeAllergens && flower.allergenRisk === "élevé")
      return false;
    if (matchOccasion && !flower.occasions.includes(request.occasion))
      return false;
    // Rien d'indisponible : on ne propose jamais ce qu'on ne peut pas livrer.
    return (
      flower.season.includes("toute l'année") || flower.season.includes(season)
    );
  });
}

function pick(
  candidates: readonly Flower[],
  { role, share, budgetShare }: (typeof ROLE_SHARE)[number],
  request: ComposeRequest,
): Flower | undefined {
  // Prix à la tige que ce rôle peut supporter sans faire exploser le budget.
  const expectedStems = Math.max(1, Math.round(REFERENCE_STEMS * share));
  const affordableUnit = (request.budget * budgetShare) / expectedStems;

  const ranked = candidates
    .filter((flower) => flower.role === role)
    .map((flower) => {
      const paletteHits = request.palette?.length
        ? flower.colors.filter((color) => request.palette?.includes(color))
            .length
        : 0;

      // Le parfum ne se demande qu'à la fleur focale : une verdure ou une
      // fleur de remplissage n'en a jamais, et l'exiger viderait le bouquet.
      const wantsFragrance = request.fragrantOnly && role === "focale";
      const fragrance =
        flower.fragrance === "prononcée"
          ? 2
          : flower.fragrance === "légère"
            ? 1
            : 0;

      const score =
        paletteHits * 6 +
        (wantsFragrance ? fragrance * 3 : fragrance) +
        flower.vaseLifeDays[1] * 0.12 -
        // Une fleur hors de l'enveloppe du rôle est pénalisée à proportion de
        // l'écart : c'est ce qui évite trois roses anglaises à 9 € pour 35 €.
        Math.abs(flower.pricePerStem - affordableUnit) * 1.4;

      return { flower, score };
    })
    .sort(
      (a, b) => b.score - a.score || a.flower.id.localeCompare(b.flower.id),
    );

  if (ranked.length === 0) return undefined;

  // La variante ne décale que la fleur focale : c'est elle qui distingue deux
  // propositions. Pour les rôles d'accompagnement on garde le meilleur choix,
  // la variété entre options étant déjà assurée par `exclude` — sans quoi une
  // composition de deuil pourrait hériter d'un santini orange.
  const offset = role === "focale" ? (request.variant ?? 0) % ranked.length : 0;
  return ranked[offset]?.flower;
}

/**
 * Ajuste les quantités pour approcher le budget, sans jamais descendre sous
 * une tige par variété ni monter au-delà d'un bouquet raisonnable.
 */
export function composeBouquet(
  request: ComposeRequest,
): ComposedBouquet | null {
  const season = seasonForDate(new Date());
  const onOccasion = eligible(request, season, true);
  const anyOccasion = eligible(request, season, false);

  const chosen = ROLE_SHARE.map((roleShare) => {
    const strict = roleShare.role !== "remplissage";
    const flower =
      pick(strict ? onOccasion : anyOccasion, roleShare, request) ??
      // Un rôle vide vaut mieux qu'un bouquet sans fleur focale : on retente
      // sans le filtre d'occasion avant d'abandonner le rôle.
      pick(anyOccasion, roleShare, request);
    return flower ? { flower, share: roleShare.share } : null;
  }).filter(
    (entry): entry is { flower: Flower; share: number } => entry !== null,
  );

  if (chosen.length === 0) return null;

  const options: BouquetOptions = { ...BASE_OPTIONS, season };
  let best: ComposedBouquet | null = null;

  for (let stems = 6; stems <= 40; stems += 1) {
    const lines = chosen.map(({ flower, share }) => ({
      flower,
      quantity: Math.max(1, Math.round(stems * share)),
    }));
    const total = priceBouquet(lines, options).total;

    const candidate: ComposedBouquet = {
      items: Object.fromEntries(
        lines.map((line) => [line.flower.id, line.quantity]),
      ),
      lines,
      total,
      stemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    };

    if (
      best === null ||
      Math.abs(total - request.budget) < Math.abs(best.total - request.budget)
    ) {
      best = candidate;
    }
    if (total > request.budget * 1.35) break;
  }

  return best;
}
