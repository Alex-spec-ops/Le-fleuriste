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
  /**
   * Ce que l'utilisateur est en train de taper. Rien d'autre n'écrit dedans :
   * une page qui veut poser une question passe par `pendingPrompt`, sinon le
   * premier caractère saisi partirait tout seul.
   */
  draft: string;
  /** Question posée par une autre page, à envoyer telle quelle à l'ouverture. */
  pendingPrompt: string | null;
  streaming: boolean;
  setOpen: (open: boolean) => void;
  openWith: (prompt: string) => void;
  consumePendingPrompt: () => string | null;
  setDraft: (draft: string) => void;
  append: (message: ChatMessage) => void;
  updateLast: (patch: Partial<ChatMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
};

export const useChatStore = create<ChatStore>()((set, get) => ({
  open: false,
  messages: [],
  draft: "",
  pendingPrompt: null,
  streaming: false,

  setOpen: (open) => set({ open }),
  openWith: (prompt) => set({ open: true, pendingPrompt: prompt }),

  /** Rend la question en attente et la retire, pour qu'elle ne parte qu'une fois. */
  consumePendingPrompt: () => {
    const { pendingPrompt } = get();
    if (pendingPrompt !== null) set({ pendingPrompt: null });
    return pendingPrompt;
  },

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
  reset: () => set({ messages: [], draft: "", pendingPrompt: null, streaming: false }),
}));
