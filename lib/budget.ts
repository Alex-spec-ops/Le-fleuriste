import type { FlowerLite } from "@/lib/flowers";
import {
  findSubstitution,
  priceBouquet,
  type BouquetOptions,
  type Substitution,
} from "@/lib/pricing";

/**
 * Curseur budget inversé : le client fixe une enveloppe, l'outil ajuste la
 * composition et explique chacun de ses arbitrages.
 *
 * Deux leviers, dans cet ordre : d'abord remplacer une fleur chère par une
 * fleur de même rôle et de couleur proche, ensuite seulement réduire les
 * quantités. Le nombre de tiges est préservé aussi longtemps que possible,
 * parce qu'un bouquet moins fourni se voit davantage qu'une substitution.
 */

export type BudgetAction =
  | { kind: "substitution"; substitution: Substitution; quantity: number }
  | { kind: "quantité"; flowerId: string; flowerName: string; from: number; to: number };

export type BudgetPlan = {
  items: Record<string, number>;
  actions: BudgetAction[];
  total: number;
  /** Vrai si l'enveloppe n'a pas pu être atteinte sans vider le bouquet. */
  exhausted: boolean;
};

const MAX_STEPS = 40;

function totalOf(
  items: Record<string, number>,
  byId: Map<string, FlowerLite>,
  options: BouquetOptions,
): number {
  const entries = Object.entries(items)
    .map(([flowerId, quantity]) => {
      const flower = byId.get(flowerId);
      return flower ? { flower, quantity } : null;
    })
    .filter((entry): entry is { flower: FlowerLite; quantity: number } => entry !== null);
  return priceBouquet(entries, options).total;
}

export function fitToBudget(
  items: Record<string, number>,
  catalog: readonly FlowerLite[],
  options: BouquetOptions,
  budget: number,
): BudgetPlan {
  const byId = new Map(catalog.map((flower) => [flower.id, flower]));
  let working: Record<string, number> = { ...items };
  const actions: BudgetAction[] = [];
  let total = totalOf(working, byId, options);

  if (total <= budget) {
    return { items: working, actions, total, exhausted: false };
  }

  const substituted = new Set<string>();

  for (let step = 0; step < MAX_STEPS && total > budget; step += 1) {
    const lines = Object.entries(working)
      .map(([flowerId, quantity]) => {
        const flower = byId.get(flowerId);
        return flower ? { flower, quantity, weight: flower.pricePerStem * quantity } : null;
      })
      .filter((line): line is { flower: FlowerLite; quantity: number; weight: number } =>
        line !== null,
      )
      .sort((a, b) => b.weight - a.weight);

    if (lines.length === 0) break;

    const target = lines.find((line) => !substituted.has(line.flower.id));
    const substitution = target ? findSubstitution(target.flower, catalog) : null;

    if (target && substitution && !working[substitution.toId]) {
      substituted.add(target.flower.id);
      substituted.add(substitution.toId);
      const quantity = target.quantity;
      const next = { ...working };
      delete next[target.flower.id];
      next[substitution.toId] = quantity;
      working = next;
      actions.push({ kind: "substitution", substitution, quantity });
      total = totalOf(working, byId, options);
      continue;
    }

    // Plus de substitution possible : on réduit la ligne la plus lourde.
    const heaviest = lines[0];
    if (!heaviest) break;
    const to = heaviest.quantity - 1;
    const next = { ...working };
    if (to <= 0) delete next[heaviest.flower.id];
    else next[heaviest.flower.id] = to;
    working = next;
    actions.push({
      kind: "quantité",
      flowerId: heaviest.flower.id,
      flowerName: heaviest.flower.nameFr,
      from: heaviest.quantity,
      to,
    });
    total = totalOf(working, byId, options);
  }

  return { items: working, actions, total, exhausted: total > budget };
}

export function describeAction(action: BudgetAction): string {
  if (action.kind === "substitution") {
    const { substitution, quantity } = action;
    return `${substitution.fromName} → ${substitution.toName} (${quantity} tiges), −${substitution.savingPercent} %, même rôle et couleur proche.`;
  }
  return action.to === 0
    ? `${action.flowerName} retirée du bouquet.`
    : `${action.flowerName} : ${action.from} → ${action.to} tiges.`;
}
