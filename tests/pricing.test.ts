import { describe, expect, it } from "vitest";

import { getAllFlowers, getFlowerById } from "@/lib/flowers";
import {
  BOUQUET_LABOUR,
  DELIVERY_PRICE,
  FREE_LOCAL_DELIVERY_FROM,
  OFF_SEASON_COEFFICIENT_DEFAULT,
  STYLE_COEFFICIENT,
  SIZE_MULTIPLIER,
  WRAPPING_PRICE,
  availabilityOf,
  eventPiece,
  findSubstitution,
  priceBouquet,
  priceEventPiece,
  priceEventQuote,
  round2,
  seasonCoefficient,
  vatIncludedIn,
  type BouquetItem,
  type BouquetOptions,
} from "@/lib/pricing";

/** Majorations d'import déclarées dans lib/pricing.ts, vérifiées ici. */
const DAHLIA_IMPORT_COEFFICIENT = 1.75;

function flower(id: string) {
  const found = getFlowerById(id);
  if (!found) throw new Error(`Fleur absente du catalogue : ${id}`);
  return found;
}

const baseOptions: BouquetOptions = {
  size: "moyen",
  wrapping: "kraft simple",
  delivery: "retrait boutique",
  style: "minimaliste",
  handwrittenCard: false,
  customRibbon: false,
  season: "printemps",
};

describe("saisonnalité", () => {
  it("ne majore pas une fleur disponible toute l'année", () => {
    const rose = flower("rose-avalanche");
    expect(availabilityOf(rose, "hiver")).toBe("en saison");
    expect(seasonCoefficient(rose, "hiver")).toBe(1);
  });

  it("majore une pivoine demandée en hiver et la signale comme import", () => {
    const pivoine = flower("pivoine-sarah-bernhardt");
    expect(availabilityOf(pivoine, "hiver")).toBe("import");
    expect(seasonCoefficient(pivoine, "hiver")).toBe(1.8);
  });

  it("signale comme indisponible une fleur sans filière d'import", () => {
    const dahlia = flower("dahlia-cafe-au-lait");
    expect(availabilityOf(dahlia, "hiver")).toBe("indisponible");
    expect(seasonCoefficient(dahlia, "hiver")).toBe(DAHLIA_IMPORT_COEFFICIENT);
  });

  it("retient la majoration par défaut pour les catégories non listées", () => {
    const oeillet = flower("oeillet-chabaud-la-france");
    expect(seasonCoefficient(oeillet, "hiver")).toBe(OFF_SEASON_COEFFICIENT_DEFAULT);
  });
});

describe("priceBouquet", () => {
  const items: BouquetItem[] = [
    { flower: flower("rose-avalanche"), quantity: 10 },
    { flower: flower("oeillet-green-trick"), quantity: 5 },
  ];

  it("additionne les lignes au prix catalogue en saison", () => {
    const quote = priceBouquet(items, baseOptions);
    const expected = round2(10 * 3.6 + 5 * 3.2);
    expect(quote.flowersTotal).toBe(expected);
    expect(quote.stemCount).toBe(15);
    expect(quote.styleCoefficient).toBe(1);
  });

  it("applique la main-d'œuvre au forfait plus le temps par tige", () => {
    const quote = priceBouquet(items, baseOptions);
    expect(quote.labour).toBe(round2(BOUQUET_LABOUR.base + 15 * BOUQUET_LABOUR.perStem));
  });

  it("multiplie les quantités selon la taille demandée", () => {
    const grand = priceBouquet(items, { ...baseOptions, size: "grand" });
    expect(grand.stemCount).toBe(
      Math.round(10 * SIZE_MULTIPLIER.grand) + Math.round(5 * SIZE_MULTIPLIER.grand),
    );
    expect(grand.total).toBeGreaterThan(priceBouquet(items, baseOptions).total);
  });

  it("applique le coefficient de style au poste fleurs uniquement", () => {
    const minimal = priceBouquet(items, baseOptions);
    const luxuriant = priceBouquet(items, { ...baseOptions, style: "luxuriant" });
    expect(luxuriant.flowersTotal).toBe(round2(minimal.flowersTotal * STYLE_COEFFICIENT.luxuriant));
    expect(luxuriant.labour).toBe(minimal.labour);
  });

  it("facture l'emballage et les options choisies", () => {
    const quote = priceBouquet(items, {
      ...baseOptions,
      wrapping: "boîte chapeau",
      handwrittenCard: true,
      customRibbon: true,
    });
    expect(quote.wrapping.amount).toBe(WRAPPING_PRICE["boîte chapeau"]);
    expect(quote.extras).toHaveLength(2);
  });

  it("offre la livraison locale au-delà du seuil et la facture en dessous", () => {
    const petit = priceBouquet([{ flower: flower("tulipe-strong-gold"), quantity: 5 }], {
      ...baseOptions,
      delivery: "locale",
    });
    expect(petit.delivery.amount).toBe(DELIVERY_PRICE.locale);

    const grand = priceBouquet([{ flower: flower("rose-red-naomi"), quantity: 25 }], {
      ...baseOptions,
      delivery: "locale",
    });
    expect(grand.total).toBeGreaterThan(FREE_LOCAL_DELIVERY_FROM);
    expect(grand.delivery.amount).toBe(0);
  });

  it("isole la majoration hors saison et prévient le client", () => {
    const quote = priceBouquet([{ flower: flower("pivoine-coral-charm"), quantity: 8 }], {
      ...baseOptions,
      season: "hiver",
    });
    expect(quote.offSeasonSurcharge).toBeGreaterThan(0);
    expect(quote.lines[0]?.availability).toBe("import");
  });

  it("prévient quand une fleur est réellement indisponible", () => {
    const quote = priceBouquet([{ flower: flower("dahlia-cornel"), quantity: 6 }], {
      ...baseOptions,
      season: "hiver",
    });
    expect(quote.warnings.join(" ")).toContain("Dahlia Cornel");
  });

  it("renvoie un devis nul pour un bouquet vide", () => {
    const quote = priceBouquet([], baseOptions);
    expect(quote.total).toBe(0);
    expect(quote.labour).toBe(0);
    expect(quote.stemCount).toBe(0);
  });

  it("calcule la TVA comprise dans le total", () => {
    const quote = priceBouquet(items, baseOptions);
    expect(quote.vatIncluded).toBe(vatIncludedIn(quote.total));
    expect(quote.vatIncluded).toBeLessThan(quote.total);
  });
});

describe("cohérence entre le simulateur et le devis événementiel", () => {
  const composition: BouquetItem[] = [
    { flower: flower("rose-sweet-avalanche"), quantity: 12 },
    { flower: flower("renoncule-clooney-hanoi"), quantity: 6 },
    { flower: flower("chrysantheme-kermit"), quantity: 4 },
  ];

  it("chiffre le même poste fleurs des deux côtés", () => {
    for (const style of ["minimaliste", "romantique", "luxuriant"] as const) {
      for (const season of ["printemps", "hiver", "été"] as const) {
        const bouquet = priceBouquet(composition, {
          ...baseOptions,
          size: "moyen",
          style,
          season,
        });
        const piece = priceEventPiece(
          { pieceId: "bouquet-mariee", quantity: 1, composition },
          { style, season },
        );
        expect(piece.flowersPerUnit).toBe(bouquet.flowersTotal);
      }
    }
  });

  it("ajoute la main-d'œuvre forfaitaire propre à la pièce florale", () => {
    const piece = priceEventPiece(
      { pieceId: "bouquet-mariee", quantity: 1, composition },
      { style: "romantique", season: "printemps" },
    );
    expect(piece.labourPerUnit).toBe(eventPiece("bouquet-mariee").labour);
    expect(piece.unitTotal).toBe(round2(piece.flowersPerUnit + piece.labourPerUnit));
  });
});

describe("priceEventQuote", () => {
  const composition: BouquetItem[] = [
    { flower: flower("rose-vendela"), quantity: 8 },
    { flower: flower("hortensia-magical-jade"), quantity: 2 },
  ];

  it("multiplie chaque pièce par sa quantité", () => {
    const quote = priceEventQuote(
      [{ pieceId: "centre-table-bas", quantity: 10, composition }],
      { season: "été", style: "champêtre" },
    );
    const unit = quote.pieces[0];
    expect(unit).toBeDefined();
    expect(quote.flowersTotal).toBe(round2((unit?.flowersPerUnit ?? 0) * 10));
    expect(quote.labourTotal).toBe(round2((unit?.labourPerUnit ?? 0) * 10));
  });

  it("déclenche l'installation pour une arche", () => {
    const quote = priceEventQuote([{ pieceId: "arche", quantity: 1, composition }], {
      season: "été",
      style: "luxuriant",
    });
    expect(quote.installation).toBeGreaterThan(0);
    expect(quote.delivery).toBeGreaterThan(0);
  });

  it("n'installe rien pour de simples boutonnières", () => {
    const quote = priceEventQuote([{ pieceId: "boutonniere", quantity: 6, composition }], {
      season: "été",
      style: "minimaliste",
    });
    expect(quote.installation).toBe(0);
  });

  it("produit une fourchette encadrant le prix recommandé", () => {
    const quote = priceEventQuote(
      [{ pieceId: "bouquet-mariee", quantity: 1, composition }],
      { season: "été", style: "romantique" },
    );
    expect(quote.range.low).toBeLessThan(quote.range.recommended);
    expect(quote.range.high).toBeGreaterThan(quote.range.recommended);
  });

  it("avertit pour chaque fleur hors saison", () => {
    const quote = priceEventQuote(
      [
        {
          pieceId: "bouquet-mariee",
          quantity: 1,
          composition: [{ flower: flower("pivoine-coral-charm"), quantity: 9 }],
        },
      ],
      { season: "hiver", style: "romantique" },
    );
    expect(quote.warnings.some((warning) => warning.includes("Coral Charm"))).toBe(true);
  });

  it("renvoie zéro quand aucune pièce n'est demandée", () => {
    const quote = priceEventQuote([], { season: "été", style: "champêtre" });
    expect(quote.total).toBe(0);
    expect(quote.delivery).toBe(0);
  });
});

describe("substitutions au budget", () => {
  it("propose une fleur moins chère de même rôle et de couleur proche", () => {
    const flowers = getAllFlowers();
    const substitution = findSubstitution(flower("pivoine-coral-charm"), flowers);
    expect(substitution).not.toBeNull();
    expect(substitution?.savingPercent).toBeGreaterThanOrEqual(15);
    expect(substitution?.toId).not.toBe("pivoine-coral-charm");
  });

  it("ne propose rien pour une fleur déjà parmi les moins chères", () => {
    const cheapest = [...getAllFlowers()].sort((a, b) => a.pricePerStem - b.pricePerStem)[0];
    expect(cheapest).toBeDefined();
    if (cheapest) {
      expect(findSubstitution(cheapest, getAllFlowers())).toBeNull();
    }
  });
});
