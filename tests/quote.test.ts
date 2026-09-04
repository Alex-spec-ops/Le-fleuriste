import { describe, expect, it } from "vitest";

import { getCatalogForClient, getFlowerById } from "@/lib/flowers";
import { priceBouquet, type BouquetOptions } from "@/lib/pricing";
import { buildQuote, suggestedTableCount } from "@/lib/quote-builder";
import { buildQuoteReference } from "@/lib/quote-pdf";
import {
  EMPTY_QUOTE_FORM,
  quoteFormSchema,
  quoteRequestSchema,
  type QuoteForm,
} from "@/lib/schemas/quote";

const catalog = getCatalogForClient();

const baseForm: QuoteForm = {
  ...EMPTY_QUOTE_FORM,
  date: "2026-06-13",
  location: "Paris",
  guests: 80,
  pieces: { "bouquet-mariee": 1, "centre-table-bas": 10, boutonniere: 6 },
  palette: ["blanc", "rose pâle"],
  style: "romantique",
  budget: 2000,
};

describe("schéma du devis", () => {
  it("accepte un formulaire complet", () => {
    expect(quoteFormSchema.safeParse(baseForm).success).toBe(true);
  });

  it("refuse une date mal formée", () => {
    expect(quoteFormSchema.safeParse({ ...baseForm, date: "13/06/2026" }).success).toBe(false);
  });

  it("refuse une palette de plus de trois teintes", () => {
    const result = quoteFormSchema.safeParse({
      ...baseForm,
      palette: ["blanc", "rouge", "vert", "jaune"],
    });
    expect(result.success).toBe(false);
  });

  it("valide la charge utile envoyée à l'API", () => {
    const result = quoteRequestSchema.safeParse({
      form: baseForm,
      contact: { name: "Camille", email: "camille@example.fr", phone: "", message: "" },
      estimatedTotal: 1840.5,
    });
    expect(result.success).toBe(true);
  });

  it("refuse une adresse e-mail invalide", () => {
    const result = quoteRequestSchema.safeParse({
      form: baseForm,
      contact: { name: "Camille", email: "pas-une-adresse" },
      estimatedTotal: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("construction du devis", () => {
  it("compose chaque pièce demandée avec des fleurs du catalogue", () => {
    const built = buildQuote(baseForm, catalog);
    expect(built.requests).toHaveLength(3);
    for (const request of built.requests) {
      expect(request.composition.length).toBeGreaterThan(0);
      for (const item of request.composition) {
        expect(getFlowerById(item.flower.id)).toBeDefined();
        expect(item.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("déduit la saison de la date", () => {
    expect(buildQuote({ ...baseForm, date: "2026-06-13" }, catalog).season).toBe("été");
    expect(buildQuote({ ...baseForm, date: "2026-01-20" }, catalog).season).toBe("hiver");
  });

  it("respecte la palette demandée pour l'essentiel des fleurs", () => {
    const built = buildQuote({ ...baseForm, palette: ["blanc"] }, catalog);
    const items = built.requests.flatMap((request) => request.composition);
    const onPalette = items.filter(
      (item) => item.flower.colors.includes("blanc") || item.flower.colors.includes("vert"),
    );
    expect(onPalette.length / items.length).toBeGreaterThan(0.5);
  });

  it("écarte les fleurs exclues et retient les fleurs imposées", () => {
    const built = buildQuote(
      {
        ...baseForm,
        constraints: {
          ...baseForm.constraints,
          excludedFlowerIds: ["rose-avalanche"],
          requiredFlowerIds: ["oeillet-prado-mint"],
        },
      },
      catalog,
    );
    const ids = built.requests.flatMap((request) =>
      request.composition.map((item) => item.flower.id),
    );
    expect(ids).not.toContain("rose-avalanche");
    expect(ids).toContain("oeillet-prado-mint");
  });

  it("évite les fleurs toxiques quand des animaux sont annoncés", () => {
    const built = buildQuote(
      { ...baseForm, constraints: { ...baseForm.constraints, pets: true } },
      catalog,
    );
    const toxic = built.requests
      .flatMap((request) => request.composition)
      .filter((item) => item.flower.toxicPets);
    expect(toxic).toHaveLength(0);
  });

  it("évite les gros pollens quand une allergie est annoncée", () => {
    const built = buildQuote(
      { ...baseForm, constraints: { ...baseForm.constraints, allergies: true } },
      catalog,
    );
    const risky = built.requests
      .flatMap((request) => request.composition)
      .filter((item) => item.flower.allergenRisk === "élevé");
    expect(risky).toHaveLength(0);
  });

  it("descend vers le budget et documente ses arbitrages", () => {
    const rich = buildQuote({ ...baseForm, budget: 12000 }, catalog);
    const tight = buildQuote({ ...baseForm, budget: 600 }, catalog);
    expect(tight.quote.total).toBeLessThan(rich.quote.total);
    expect(tight.adjustments.length).toBeGreaterThan(0);
  });

  it("chiffre chaque pièce avec le moteur commun", () => {
    const built = buildQuote(baseForm, catalog);
    const piece = built.quote.pieces[0];
    const request = built.requests[0];
    expect(piece && request).toBeTruthy();
    if (!piece || !request) return;

    const options: BouquetOptions = {
      size: "moyen",
      wrapping: "kraft simple",
      delivery: "retrait boutique",
      style: baseForm.style,
      handwrittenCard: false,
      customRibbon: false,
      season: built.season,
    };
    expect(piece.flowersPerUnit).toBe(priceBouquet(request.composition, options).flowersTotal);
  });

  it("renvoie un devis nul quand aucune pièce n'est demandée", () => {
    const built = buildQuote({ ...baseForm, pieces: {} }, catalog);
    expect(built.quote.total).toBe(0);
    expect(built.requests).toHaveLength(0);
  });
});

describe("utilitaires du devis", () => {
  it("compte huit convives par table", () => {
    expect(suggestedTableCount(80)).toBe(10);
    expect(suggestedTableCount(1)).toBe(1);
    expect(suggestedTableCount(0)).toBe(1);
  });

  it("produit une référence stable et lisible", () => {
    const now = new Date("2026-09-04T10:00:00Z");
    const reference = buildQuoteReference(baseForm, now);
    expect(reference).toMatch(/^DEV-\d{6}-\d{4}$/);
    expect(buildQuoteReference(baseForm, now)).toBe(reference);
  });
});
