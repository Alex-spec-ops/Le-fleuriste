import { COMPOSER_CLOSE, COMPOSER_OPEN } from "@/lib/chat/system-prompt";
import { keepKnownFlowers } from "@/lib/chat/tools";

/** Composition proposée par le conseiller, une fois validée. */
export type ParsedSuggestion = { title: string; items: Record<string, number> };

/**
 * Sépare, dans le flux de texte du modèle, ce qui doit s'afficher de ce qui
 * doit devenir un bouton « Composer ce bouquet ».
 *
 * Le filtre travaille en continu : il retient juste assez de caractères pour
 * ne jamais couper un marqueur à cheval sur deux fragments.
 */
export class MarkerFilter {
  private buffer = "";
  private inside = false;
  private readonly collected: ParsedSuggestion[] = [];

  /** Consomme un fragment et renvoie le texte affichable correspondant. */
  push(chunk: string): string {
    this.buffer += chunk;
    let output = "";

    while (true) {
      if (this.inside) {
        const end = this.buffer.indexOf(COMPOSER_CLOSE);
        if (end === -1) return output;
        const raw = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + COMPOSER_CLOSE.length);
        this.inside = false;
        this.collect(raw);
        continue;
      }

      const start = this.buffer.indexOf(COMPOSER_OPEN);
      if (start === -1) {
        // On garde de côté un éventuel début de marqueur incomplet.
        const keep = Math.max(
          0,
          this.buffer.length - (COMPOSER_OPEN.length - 1),
        );
        output += this.buffer.slice(0, keep);
        this.buffer = this.buffer.slice(keep);
        return output;
      }

      output += this.buffer.slice(0, start);
      this.buffer = this.buffer.slice(start + COMPOSER_OPEN.length);
      this.inside = true;
    }
  }

  /** Vide le tampon en fin de flux. */
  flush(): string {
    if (this.inside) {
      this.buffer = "";
      this.inside = false;
      return "";
    }
    const rest = this.buffer;
    this.buffer = "";
    return rest;
  }

  suggestions(): ParsedSuggestion[] {
    return this.collected;
  }

  private collect(raw: string): void {
    try {
      const parsed: unknown = JSON.parse(raw.trim());
      if (typeof parsed !== "object" || parsed === null) return;
      const candidate = parsed as { title?: unknown; items?: unknown };
      const title =
        typeof candidate.title === "string" ? candidate.title.slice(0, 80) : "";
      if (
        !title ||
        typeof candidate.items !== "object" ||
        candidate.items === null
      )
        return;

      const items = keepKnownFlowers(candidate.items as Record<string, number>);
      if (Object.keys(items).length === 0) return;
      if (this.collected.length >= 4) return;
      this.collected.push({ title, items });
    } catch {
      // Bloc mal formé : on l'ignore silencieusement plutôt que de polluer la réponse.
    }
  }
}

/** Sentinelle séparant le texte des compositions dans la réponse streamée. */
export const SUGGESTIONS_SENTINEL = `${String.fromCharCode(0)}SUGGESTIONS${String.fromCharCode(0)}`;
