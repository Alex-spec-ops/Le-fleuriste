import { z } from "zod";

import { BOUQUET_SIZES, DELIVERY_MODES, STYLES, WRAPPINGS } from "@/lib/constants";

/**
 * Sérialisation de l'état du composeur : sauvegarde locale, partage par lien
 * et passerelle vers le devis événementiel utilisent tous ce format.
 */

export const bouquetStateSchema = z.object({
  items: z.record(z.string(), z.number().int().min(0).max(400)),
  seed: z.number().int().min(0),
  size: z.enum(BOUQUET_SIZES),
  wrapping: z.enum(WRAPPINGS),
  delivery: z.enum(DELIVERY_MODES),
  style: z.enum(STYLES),
  handwrittenCard: z.boolean(),
  customRibbon: z.boolean(),
});

export type BouquetState = z.infer<typeof bouquetStateSchema>;

export const EMPTY_BOUQUET: BouquetState = {
  items: {},
  seed: 1,
  size: "moyen",
  wrapping: "kraft simple",
  delivery: "retrait boutique",
  style: "champêtre",
  handwrittenCard: false,
  customRibbon: false,
};

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Forme compacte : les clés longues deviennent des lettres. */
type Packed = {
  i: Record<string, number>;
  d: number;
  s: string;
  w: string;
  l: string;
  y: string;
  c: 0 | 1;
  r: 0 | 1;
};

export function encodeBouquet(state: BouquetState): string {
  const packed: Packed = {
    i: Object.fromEntries(Object.entries(state.items).filter(([, quantity]) => quantity > 0)),
    d: state.seed,
    s: state.size,
    w: state.wrapping,
    l: state.delivery,
    y: state.style,
    c: state.handwrittenCard ? 1 : 0,
    r: state.customRibbon ? 1 : 0,
  };
  return toBase64Url(JSON.stringify(packed));
}

export function decodeBouquet(token: string): BouquetState | null {
  try {
    const raw: unknown = JSON.parse(fromBase64Url(token));
    if (typeof raw !== "object" || raw === null) return null;
    const packed = raw as Partial<Packed>;
    const candidate = {
      items: packed.i ?? {},
      seed: packed.d ?? 1,
      size: packed.s ?? EMPTY_BOUQUET.size,
      wrapping: packed.w ?? EMPTY_BOUQUET.wrapping,
      delivery: packed.l ?? EMPTY_BOUQUET.delivery,
      style: packed.y ?? EMPTY_BOUQUET.style,
      handwrittenCard: packed.c === 1,
      customRibbon: packed.r === 1,
    };
    const parsed = bouquetStateSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
