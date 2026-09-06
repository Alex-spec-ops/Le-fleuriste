"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { BouquetSize, DeliveryMode, Style, Wrapping } from "@/lib/constants";
import { EMPTY_BOUQUET, type BouquetState } from "@/lib/bouquet-share";

/**
 * État partagé du bouquet en cours de composition.
 * Conservé dans le navigateur (localStorage) pour que le client retrouve son
 * travail, et lu par le catalogue, le composeur, le simulateur, le devis et
 * le conseiller.
 */

type BouquetActions = {
  add: (flowerId: string, quantity?: number) => void;
  remove: (flowerId: string, quantity?: number) => void;
  setQuantity: (flowerId: string, quantity: number) => void;
  clear: () => void;
  shuffle: () => void;
  undo: () => void;
  replace: (state: BouquetState) => void;
  setSize: (size: BouquetSize) => void;
  setWrapping: (wrapping: Wrapping) => void;
  setDelivery: (delivery: DeliveryMode) => void;
  setStyle: (style: Style) => void;
  setHandwrittenCard: (value: boolean) => void;
  setCustomRibbon: (value: boolean) => void;
};

type BouquetStore = BouquetState & {
  /** Pile des états précédents, pour le bouton « Annuler ». */
  history: BouquetState[];
} & BouquetActions;

const MAX_HISTORY = 40;

function snapshot(state: BouquetStore): BouquetState {
  return {
    items: { ...state.items },
    seed: state.seed,
    size: state.size,
    wrapping: state.wrapping,
    delivery: state.delivery,
    style: state.style,
    handwrittenCard: state.handwrittenCard,
    customRibbon: state.customRibbon,
  };
}

function pushHistory(state: BouquetStore): BouquetState[] {
  return [...state.history, snapshot(state)].slice(-MAX_HISTORY);
}

export const useBouquetStore = create<BouquetStore>()(
  persist(
    (set) => ({
      ...EMPTY_BOUQUET,
      history: [],

      add: (flowerId, quantity = 1) =>
        set((state) => ({
          history: pushHistory(state),
          items: {
            ...state.items,
            [flowerId]: Math.min(400, (state.items[flowerId] ?? 0) + quantity),
          },
        })),

      remove: (flowerId, quantity = 1) =>
        set((state) => {
          const next = { ...state.items };
          const remaining = (next[flowerId] ?? 0) - quantity;
          if (remaining > 0) next[flowerId] = remaining;
          else delete next[flowerId];
          return { history: pushHistory(state), items: next };
        }),

      setQuantity: (flowerId, quantity) =>
        set((state) => {
          const next = { ...state.items };
          if (quantity > 0) next[flowerId] = Math.min(400, Math.round(quantity));
          else delete next[flowerId];
          return { history: pushHistory(state), items: next };
        }),

      clear: () => set((state) => ({ history: pushHistory(state), items: {} })),

      shuffle: () =>
        set((state) => ({
          history: pushHistory(state),
          seed: (state.seed + 1 + Math.floor(Math.random() * 9973)) % 100000,
        })),

      undo: () =>
        set((state) => {
          const previous = state.history.at(-1);
          if (!previous) return state;
          return { ...previous, history: state.history.slice(0, -1) };
        }),

      replace: (next) => set((state) => ({ ...next, history: pushHistory(state) })),

      setSize: (size) => set((state) => ({ history: pushHistory(state), size })),
      setWrapping: (wrapping) => set((state) => ({ history: pushHistory(state), wrapping })),
      setDelivery: (delivery) => set((state) => ({ history: pushHistory(state), delivery })),
      setStyle: (style) => set((state) => ({ history: pushHistory(state), style })),
      setHandwrittenCard: (handwrittenCard) =>
        set((state) => ({ history: pushHistory(state), handwrittenCard })),
      setCustomRibbon: (customRibbon) =>
        set((state) => ({ history: pushHistory(state), customRibbon })),
    }),
    {
      name: "lefleuriste:bouquet",
      version: 1,
      partialize: (state) => snapshot(state),
    },
  ),
);

/** Nombre total de tiges, sans multiplicateur de taille. */
export function totalStems(items: Record<string, number>): number {
  return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}
