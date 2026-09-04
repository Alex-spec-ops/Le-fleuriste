"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flower, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { SUGGESTIONS_SENTINEL, type ParsedSuggestion } from "@/lib/chat/marker-filter";
import { useBouquetStore } from "@/lib/store/bouquet-store";
import { useChatStore, type ChatMessage } from "@/lib/store/chat-store";

const STARTERS = [
  "Je vais à un premier rendez-vous",
  "J'ai été invité à dîner",
  "Un mariage en juin, 80 invités",
  "Des condoléances, je ne sais pas quoi choisir",
] as const;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatWidget() {
  const router = useRouter();
  const open = useChatStore((state) => state.open);
  const setOpen = useChatStore((state) => state.setOpen);
  const messages = useChatStore((state) => state.messages);
  const draft = useChatStore((state) => state.draft);
  const setDraft = useChatStore((state) => state.setDraft);
  const append = useChatStore((state) => state.append);
  const updateLast = useChatStore((state) => state.updateLast);
  const streaming = useChatStore((state) => state.streaming);
  const setStreaming = useChatStore((state) => state.setStreaming);

  const replaceBouquet = useBouquetStore((state) => state.replace);
  const seed = useBouquetStore((state) => state.seed);
  const size = useBouquetStore((state) => state.size);
  const wrapping = useBouquetStore((state) => state.wrapping);
  const delivery = useBouquetStore((state) => state.delivery);
  const style = useBouquetStore((state) => state.style);
  const handwrittenCard = useBouquetStore((state) => state.handwrittenCard);
  const customRibbon = useBouquetStore((state) => state.customRibbon);

  const listRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (content.length === 0 || streaming) return;

    setError(null);
    setDraft("");
    const history: ChatMessage[] = [
      ...messages,
      { id: newId(), role: "user", content },
    ];
    append({ id: newId(), role: "user", content });
    append({ id: newId(), role: "assistant", content: "", pending: true });
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Le conseiller n'a pas pu répondre.");
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;

        const cut = buffer.indexOf(SUGGESTIONS_SENTINEL);
        const visible = cut === -1 ? buffer : buffer.slice(0, cut);
        updateLast({ content: visible, pending: false });
      }

      const cut = buffer.indexOf(SUGGESTIONS_SENTINEL);
      let suggestions: ParsedSuggestion[] = [];
      if (cut !== -1) {
        try {
          const parsed: unknown = JSON.parse(buffer.slice(cut + SUGGESTIONS_SENTINEL.length));
          if (Array.isArray(parsed)) suggestions = parsed as ParsedSuggestion[];
        } catch {
          suggestions = [];
        }
      }
      updateLast({
        content: (cut === -1 ? buffer : buffer.slice(0, cut)).trim(),
        pending: false,
        suggestions,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Une erreur est survenue.";
      setError(message);
      updateLast({
        content:
          "Je n'arrive pas à vous répondre pour le moment. Vous pouvez composer votre bouquet vous-même, ou appeler la boutique.",
        pending: false,
      });
    } finally {
      setStreaming(false);
    }
  };

  // Un autre écran a pu préremplir le champ : on l'envoie dès l'ouverture.
  const autoSent = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !draft || streaming) return;
    if (autoSent.current === draft) return;
    if (messages.length > 0 && messages.at(-1)?.role === "user") return;
    autoSent.current = draft;
    void send(draft);
    // send est stable pour cet usage : il ne dépend que du store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  const applySuggestion = (suggestion: ParsedSuggestion) => {
    replaceBouquet({
      items: suggestion.items,
      seed,
      size,
      wrapping,
      delivery,
      style,
      handwrittenCard,
      customRibbon,
    });
    setOpen(false);
    toast.success(`« ${suggestion.title} » chargé dans le composeur`);
    router.push("/composer");
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-12 gap-2 rounded-full px-5 shadow-lg"
        aria-haspopup="dialog"
      >
        <Flower aria-hidden />
        Conseil fleuriste
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border">
            <SheetTitle className="font-heading text-xl">Le conseil du fleuriste</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Dites-nous pour qui et à quelle occasion : nous vous orientons.
            </p>
          </SheetHeader>

          <div ref={listRef} className="scroll-soft flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  Par exemple :
                </p>
                <ul className="mt-3 space-y-2">
                  {STARTERS.map((starter) => (
                    <li key={starter}>
                      <button
                        type="button"
                        onClick={() => void send(starter)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {starter}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-3.5 py-2.5 text-sm"
                    : "max-w-[92%] text-sm leading-relaxed"
                }
              >
                {message.role === "assistant" ? (
                  <p className="mb-1 text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Le fleuriste
                  </p>
                ) : null}

                {message.pending && message.content.length === 0 ? (
                  <p className="text-muted-foreground" aria-live="polite">
                    Le conseiller réfléchit…
                  </p>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}

                {message.suggestions && message.suggestions.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion) => (
                      <li key={suggestion.title}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Composer « {suggestion.title} »
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <form
            className="border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label htmlFor="message-fleuriste" className="sr-only">
              Votre message au fleuriste
            </label>
            <div className="flex items-end gap-2">
              <Textarea
                id="message-fleuriste"
                value={draft}
                rows={2}
                disabled={streaming}
                placeholder="Pour qui, quelle occasion, quel budget…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                className="min-h-16 resize-none"
              />
              <Button type="submit" size="icon" disabled={streaming || draft.trim().length === 0}>
                <Send aria-hidden />
                <span className="sr-only">Envoyer</span>
              </Button>
            </div>
            <p className="mt-2 text-[0.7rem] text-muted-foreground">
              Conseil indicatif. La disponibilité des fleurs est à confirmer avec la boutique.
            </p>
          </form>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3"
            onClick={() => setOpen(false)}
          >
            <X aria-hidden />
            <span className="sr-only">Fermer le conseil</span>
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
