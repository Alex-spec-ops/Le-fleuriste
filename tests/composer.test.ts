import { describe, expect, it } from "vitest";

import { SHOP_BOUQUETS } from "@/data/boutique";
import { analyseHarmony } from "@/lib/bouquet-harmony";
import { CANVAS, MAX_RENDERED_STEMS, layoutBouquet } from "@/lib/bouquet-layout";
import { EMPTY_BOUQUET, decodeBouquet, encodeBouquet } from "@/lib/bouquet-share";
import { BOUQUET_TEMPLATES } from "@/lib/bouquet-templates";
import { describeAction, fitToBudget } from "@/lib/budget";
import { EMPTY_FILTERS, filterFlowers } from "@/lib/filter";
import { getCatalogForClient, getFlowerById, toFlowerLite } from "@/lib/flowers";
import { priceBouquet, type BouquetOptions } from "@/lib/pricing";

const catalog = getCatalogForClient();

function lite(id: string) {
  const flower = getFlowerById(id);
  if (!flower) throw new Error(`Fleur absente : ${id}`);
  return toFlowerLite(flower);
}

const options: BouquetOptions = {
  size: "moyen",
  wrapping: "kraft simple",
  delivery: "retrait boutique",
  style: "champêtre",
  handwrittenCard: false,
  customRibbon: false,
  season: "printemps",
};

describe("modèles et sélection de la boutique", () => {
  it("ne référence que des fleurs existantes dans les modèles", () => {
    for (const template of BOUQUET_TEMPLATES) {
      for (const id of Object.keys(template.items)) {
        expect(getFlowerById(id), `${template.label} → ${id}`).toBeDefined();
      }
    }
  });

  it("ne référence que des fleurs existantes dans la sélection boutique", () => {
    for (const bouquet of SHOP_BOUQUETS) {
      for (const id of Object.keys(bouquet.items)) {
        expect(getFlowerById(id), `${bouquet.name} → ${id}`).toBeDefined();
      }
    }
  });

  it("chiffre chaque bouquet de la boutique à un prix de détail plausible", () => {
    for (const bouquet of SHOP_BOUQUETS) {
      const entries = Object.entries(bouquet.items).map(([id, quantity]) => ({
        flower: lite(id),
        quantity,
      }));
      const quote = priceBouquet(entries, {
        ...options,
        size: bouquet.size,
        wrapping: bouquet.wrapping,
        style: bouquet.style,
      });
      expect(quote.total, bouquet.name).toBeGreaterThan(15);
      expect(quote.total, bouquet.name).toBeLessThan(400);
    }
  });
});

describe("disposition du bouquet", () => {
  const entries = BOUQUET_TEMPLATES.map((template) =>
    Object.entries(template.items).map(([id, quantity]) => ({ flower: lite(id), quantity })),
  );

  it("place toutes les têtes dans le cadre", () => {
    for (const composition of entries) {
      const layout = layoutBouquet(composition, 3);
      for (const stem of layout.stems) {
        expect(stem.x).toBeGreaterThan(0);
        expect(stem.x).toBeLessThan(CANVAS.width);
        expect(stem.y).toBeGreaterThan(0);
        expect(stem.y).toBeLessThan(CANVAS.bindY);
      }
    }
  });

  it("dessine le feuillage et la structure derrière les fleurs focales", () => {
    const composition = [
      { flower: lite("chrysantheme-kermit"), quantity: 4 },
      { flower: lite("rose-avalanche"), quantity: 4 },
    ];
    const layout = layoutBouquet(composition, 1);
    const firstFocal = layout.stems.findIndex((stem) => stem.flower.role === "focale");
    const lastFilling = layout.stems.findLastIndex(
      (stem) => stem.flower.role === "remplissage",
    );
    expect(lastFilling).toBeLessThan(firstFocal);
  });

  it("reste déterministe à graine constante et change avec la graine", () => {
    const composition = [{ flower: lite("rose-avalanche"), quantity: 9 }];
    expect(JSON.stringify(layoutBouquet(composition, 4))).toBe(
      JSON.stringify(layoutBouquet(composition, 4)),
    );
    expect(JSON.stringify(layoutBouquet(composition, 4))).not.toBe(
      JSON.stringify(layoutBouquet(composition, 5)),
    );
  });

  it("plafonne le nombre de tiges dessinées et le signale", () => {
    const layout = layoutBouquet([{ flower: lite("rose-freedom"), quantity: 400 }], 1);
    expect(layout.stems).toHaveLength(MAX_RENDERED_STEMS);
    expect(layout.omitted).toBe(400 - MAX_RENDERED_STEMS);
    expect(layout.totalStems).toBe(400);
  });

  it("rend un bouquet vide sans erreur", () => {
    const layout = layoutBouquet([], 1);
    expect(layout.stems).toHaveLength(0);
    expect(layout.totalStems).toBe(0);
  });
});

describe("contrôle d'harmonie", () => {
  it("ne dit rien sur un bouquet vide", () => {
    expect(analyseHarmony([])).toHaveLength(0);
  });

  it("signale l'absence de verdure sur un bouquet fourni", () => {
    const notes = analyseHarmony([{ flower: lite("rose-avalanche"), quantity: 12 }]);
    expect(notes.some((note) => note.id === "sans-verdure")).toBe(true);
  });

  it("signale un excès de fleurs focales", () => {
    const notes = analyseHarmony([
      { flower: lite("rose-avalanche"), quantity: 10 },
      { flower: lite("pivoine-sarah-bernhardt"), quantity: 6 },
      { flower: lite("chrysantheme-kermit"), quantity: 1 },
    ]);
    expect(notes.some((note) => note.id === "trop-de-focales")).toBe(true);
  });

  it("prévient de la toxicité pour les animaux", () => {
    const notes = analyseHarmony([{ flower: lite("lys-casa-blanca"), quantity: 3 }]);
    expect(notes.some((note) => note.id === "toxique-animaux")).toBe(true);
    expect(notes.some((note) => note.id === "allergenes")).toBe(true);
  });

  it("félicite une composition équilibrée", () => {
    const notes = analyseHarmony([
      { flower: lite("rose-avalanche"), quantity: 5 },
      { flower: lite("rose-snowflake"), quantity: 3 },
      { flower: lite("chrysantheme-kermit"), quantity: 4 },
    ]);
    expect(notes.some((note) => note.id === "equilibre")).toBe(true);
  });
});

describe("ajustement au budget", () => {
  it("ne touche à rien quand la composition tient déjà", () => {
    const items = { "tulipe-strong-gold": 5 };
    const plan = fitToBudget(items, catalog, options, 200);
    expect(plan.actions).toHaveLength(0);
    expect(plan.items).toEqual(items);
  });

  it("réduit le total et explique chaque arbitrage", () => {
    const items = { "pivoine-coral-charm": 12, "rose-juliet": 8 };
    const before = priceBouquet(
      Object.entries(items).map(([id, quantity]) => ({ flower: lite(id), quantity })),
      options,
    ).total;
    const plan = fitToBudget(items, catalog, options, 90);

    expect(plan.total).toBeLessThan(before);
    expect(plan.actions.length).toBeGreaterThan(0);
    for (const action of plan.actions) {
      expect(describeAction(action).length).toBeGreaterThan(10);
    }
  });

  it("s'arrête proprement sur un budget irréaliste", () => {
    const plan = fitToBudget({ "rose-juliet": 20 }, catalog, options, 5);
    expect(plan.exhausted).toBe(true);
    expect(plan.total).toBeGreaterThanOrEqual(0);
  });
});

describe("partage de composition", () => {
  it("fait un aller-retour sans perte", () => {
    const state = {
      ...EMPTY_BOUQUET,
      items: { "rose-avalanche": 9, "chrysantheme-kermit": 3 },
      seed: 42,
      size: "grand" as const,
      wrapping: "boîte chapeau" as const,
      delivery: "express jour même" as const,
      style: "luxuriant" as const,
      handwrittenCard: true,
      customRibbon: false,
    };
    expect(decodeBouquet(encodeBouquet(state))).toEqual(state);
  });

  it("refuse un jeton corrompu", () => {
    expect(decodeBouquet("pas-un-jeton")).toBeNull();
    expect(decodeBouquet("")).toBeNull();
  });

  it("écarte les quantités nulles", () => {
    const token = encodeBouquet({ ...EMPTY_BOUQUET, items: { "rose-akito": 0, "rose-aqua": 4 } });
    expect(decodeBouquet(token)?.items).toEqual({ "rose-aqua": 4 });
  });
});

describe("filtres partagés", () => {
  it("retourne tout le catalogue sans filtre", () => {
    expect(filterFlowers(catalog, EMPTY_FILTERS)).toHaveLength(catalog.length);
  });

  it("combine recherche, couleur et sécurité animaux", () => {
    const results = filterFlowers(catalog, {
      ...EMPTY_FILTERS,
      search: "rose",
      colors: ["blanc"],
      petSafe: true,
    });
    expect(results.length).toBeGreaterThan(0);
    for (const flower of results) {
      expect(flower.toxicPets).toBe(false);
      expect(flower.colors).toContain("blanc");
    }
  });
});
