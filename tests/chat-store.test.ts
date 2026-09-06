import { beforeEach, describe, expect, it } from "vitest";

import { useChatStore } from "@/lib/store/chat-store";

/**
 * Le champ de saisie et les questions posées par une autre page sont deux
 * choses différentes. Les avoir confondues faisait partir le message dès le
 * premier caractère tapé : l'utilisateur ne pouvait plus écrire une phrase.
 * Ces tests verrouillent la séparation.
 */
describe("état de la conversation", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useChatStore.setState({ open: false });
  });

  it("laisse l'utilisateur composer sans rien déclencher", () => {
    const { setDraft } = useChatStore.getState();
    for (const partial of ["J", "Je", "Je c", "Je cherche un bouquet"]) {
      setDraft(partial);
      expect(useChatStore.getState().pendingPrompt).toBeNull();
    }
    expect(useChatStore.getState().draft).toBe("Je cherche un bouquet");
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("ouvre le panneau avec une question sans toucher à la saisie", () => {
    useChatStore.getState().setDraft("brouillon en cours");
    useChatStore.getState().openWith("Que pensez-vous de ma composition ?");

    const state = useChatStore.getState();
    expect(state.open).toBe(true);
    expect(state.pendingPrompt).toBe("Que pensez-vous de ma composition ?");
    expect(state.draft).toBe("brouillon en cours");
  });

  it("ne consomme la question qu'une seule fois", () => {
    useChatStore.getState().openWith("Un bouquet pour un mariage");
    expect(useChatStore.getState().consumePendingPrompt()).toBe("Un bouquet pour un mariage");
    expect(useChatStore.getState().consumePendingPrompt()).toBeNull();
    expect(useChatStore.getState().pendingPrompt).toBeNull();
  });

  it("empile les messages et complète le dernier pendant le streaming", () => {
    const { append, updateLast } = useChatStore.getState();
    append({ id: "1", role: "user", content: "Bonjour" });
    append({ id: "2", role: "assistant", content: "", pending: true });
    updateLast({ content: "Bonjour, ", pending: false });
    updateLast({ content: "Bonjour, et bienvenue." });

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[1]?.content).toBe("Bonjour, et bienvenue.");
    expect(messages[1]?.pending).toBe(false);
    expect(messages[0]?.content).toBe("Bonjour");
  });

  it("ne casse pas si updateLast est appelé sans message", () => {
    useChatStore.getState().updateLast({ content: "orphelin" });
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("remet tout à zéro", () => {
    useChatStore.getState().openWith("question");
    useChatStore.getState().setDraft("saisie");
    useChatStore.getState().append({ id: "1", role: "user", content: "test" });
    useChatStore.getState().setStreaming(true);

    useChatStore.getState().reset();

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(0);
    expect(state.draft).toBe("");
    expect(state.pendingPrompt).toBeNull();
    expect(state.streaming).toBe(false);
  });
});
