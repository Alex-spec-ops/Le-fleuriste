"use client";

import { create } from "zustand";

/** Rôle d'un message dans la conversation affichée. */
export type ChatRole = "user" | "assistant";

export type ChatSuggestion = {
  /** Nom donné à la proposition par le conseiller. */
  title: string;
  /** Identifiants de fleurs du catalogue, avec les quantités conseillées. */
  items: Record<string, number>;
  estimate?: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Compositions proposées, transformables en bouquet d'un clic. */
  suggestions?: ChatSuggestion[];
  pending?: boolean;
};

type ChatStore = {
  open: boolean;
  messages: ChatMessage[];
  /** Message prérempli dans le champ de saisie, posé par une autre page. */
  draft: string;
  streaming: boolean;
  setOpen: (open: boolean) => void;
  openWith: (draft: string) => void;
  setDraft: (draft: string) => void;
  append: (message: ChatMessage) => void;
  updateLast: (patch: Partial<ChatMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
};

export const useChatStore = create<ChatStore>()((set) => ({
  open: false,
  messages: [],
  draft: "",
  streaming: false,

  setOpen: (open) => set({ open }),
  openWith: (draft) => set({ open: true, draft }),
  setDraft: (draft) => set({ draft }),

  append: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateLast: (patch) =>
    set((state) => {
      if (state.messages.length === 0) return state;
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (!last) return state;
      messages[messages.length - 1] = { ...last, ...patch };
      return { messages };
    }),

  setStreaming: (streaming) => set({ streaming }),
  reset: () => set({ messages: [], draft: "", streaming: false }),
}));
