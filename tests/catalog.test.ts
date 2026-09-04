import { describe, expect, it } from "vitest";

import { rawCatalog } from "@/data/catalog";
import { CATEGORIES, COLOR_SWATCHES, COLORS } from "@/lib/constants";
import { buildFlowerArt, flowerSvgMarkup, hashSeed, shapeFamily } from "@/lib/flower-art";
import { getAllFlowers, getCatalogCsvIndex, getFlowerById, searchFlowers } from "@/lib/flowers";
import { PAGE_EMBLEM, emblemFor } from "@/lib/page-emblem";
import { flowerCatalogSchema, isValidBotanicalName } from "@/lib/schemas/flower";

describe("intégrité du catalogue", () => {
  it("valide les données sources avec le schéma Zod", () => {
    const result = flowerCatalogSchema.safeParse(rawCatalog);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .slice(0, 10)
          .map((issue) => `[${issue.path.join(".")}] ${issue.message}`)
          .join("\n"),
      );
    }
    expect(result.success).toBe(true);
  });

  it("valide aussi le JSON publié, qui doit être à jour", () => {
    expect(flowerCatalogSchema.safeParse(getAllFlowers()).success).toBe(true);
    expect(getAllFlowers().length).toBe(rawCatalog.length);
  });

  it("n'a ni identifiant ni nom français en double", () => {
    const flowers = getAllFlowers();
    expect(new Set(flowers.map((flower) => flower.id)).size).toBe(flowers.length);
    expect(new Set(flowers.map((flower) => flower.nameFr)).size).toBe(flowers.length);
  });

  it("n'a pas deux fleurs partageant la même description", () => {
    const flowers = getAllFlowers();
    expect(new Set(flowers.map((flower) => flower.description)).size).toBe(flowers.length);
  });

  it("emploie une nomenclature botanique bien formée", () => {
    for (const flower of getAllFlowers()) {
      expect(isValidBotanicalName(flower.nameLatin), flower.nameLatin).toBe(true);
    }
  });

  it("rattache chaque fleur à une catégorie de l'énumération", () => {
    for (const flower of getAllFlowers()) {
      expect(CATEGORIES).toContain(flower.category);
    }
  });

  it("propose au moins quinze entrées dans chaque catégorie pourvue", () => {
    const counts = new Map<string, number>();
    for (const flower of getAllFlowers()) {
      counts.set(flower.category, (counts.get(flower.category) ?? 0) + 1);
    }
    for (const [category, count] of counts) {
      expect(count, category).toBeGreaterThanOrEqual(15);
    }
  });

  it("garde des prix dans une fourchette de détail plausible", () => {
    for (const flower of getAllFlowers()) {
      expect(flower.pricePerStem, flower.nameFr).toBeGreaterThanOrEqual(1);
      expect(flower.pricePerStem, flower.nameFr).toBeLessThanOrEqual(20);
    }
  });

  it("ne déclare jamais un import hors saison pour une fleur de toute l'année", () => {
    for (const flower of getAllFlowers()) {
      if (flower.season.includes("toute l'année")) {
        expect(flower.offSeasonImport, flower.nameFr).toBe(false);
      }
    }
  });

  it("associe une pastille de couleur à chaque couleur normalisée", () => {
    for (const color of COLORS) {
      expect(COLOR_SWATCHES[color]).toBeDefined();
    }
  });

  it("fait pointer chaque image vers la route d'illustration correspondante", () => {
    for (const flower of getAllFlowers()) {
      expect(flower.imageUrl).toBe(`/illustrations/${flower.id}.svg`);
    }
  });
});

describe("couche d'accès", () => {
  it("retrouve une fleur par identifiant", () => {
    expect(getFlowerById("rose-avalanche")?.nameFr).toBe("Rose Avalanche");
    expect(getFlowerById("fleur-inexistante")).toBeUndefined();
  });

  it("cherche sans tenir compte des accents ni de la casse", () => {
    const results = searchFlowers({ search: "PIVOINE sarah" });
    expect(results.some((flower) => flower.id === "pivoine-sarah-bernhardt")).toBe(true);
  });

  it("filtre sur la couleur, le prix et la sécurité pour les animaux", () => {
    const results = searchFlowers({ colors: ["blanc"], maxPricePerStem: 4, petSafe: true });
    expect(results.length).toBeGreaterThan(0);
    for (const flower of results) {
      expect(flower.colors).toContain("blanc");
      expect(flower.pricePerStem).toBeLessThanOrEqual(4);
      expect(flower.toxicPets).toBe(false);
    }
  });

  it("laisse passer les fleurs de toute l'année quel que soit le filtre de saison", () => {
    const results = searchFlowers({ seasons: ["hiver"] });
    expect(results.some((flower) => flower.season.includes("toute l'année"))).toBe(true);
  });

  it("produit un index CSV d'une ligne par fleur pour le conseiller", () => {
    const lines = getCatalogCsvIndex().split("\n");
    expect(lines).toHaveLength(getAllFlowers().length + 1);
    expect(lines[0]).toContain("id;nom;categorie");
  });
});

describe("illustrations paramétriques", () => {
  it("produit un dessin identique pour une même fleur", () => {
    const flower = getFlowerById("rose-avalanche");
    expect(flower).toBeDefined();
    if (!flower) return;
    expect(JSON.stringify(buildFlowerArt(flower))).toBe(JSON.stringify(buildFlowerArt(flower)));
  });

  it("distingue deux cultivars de la même famille", () => {
    const first = getFlowerById("rose-avalanche");
    const second = getFlowerById("rose-akito");
    expect(first && second).toBeTruthy();
    if (!first || !second) return;
    expect(JSON.stringify(buildFlowerArt(first))).not.toBe(JSON.stringify(buildFlowerArt(second)));
  });

  it("dessine chaque fleur du catalogue sans erreur", () => {
    for (const flower of getAllFlowers()) {
      const art = buildFlowerArt(flower);
      expect(art.shapes.length, flower.nameFr).toBeGreaterThan(3);
      expect(shapeFamily(flower.category, flower.role)).toBeTruthy();
    }
  });

  it("sérialise un SVG valide et accessible", () => {
    const flower = getFlowerById("tulipe-queen-of-night");
    expect(flower).toBeDefined();
    if (!flower) return;
    const markup = flowerSvgMarkup(flower, flower.nameFr);
    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup).toContain("role=\"img\"");
    expect(markup).toContain(flower.nameFr);
    expect(markup.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("hache les identifiants de façon stable", () => {
    expect(hashSeed("rose-avalanche")).toBe(hashSeed("rose-avalanche"));
    expect(hashSeed("rose-avalanche")).not.toBe(hashSeed("rose-akito"));
  });
});

describe("emblèmes de page", () => {
  it("désigne une fleur réellement au catalogue pour chaque page", () => {
    for (const [route, emblem] of Object.entries(PAGE_EMBLEM)) {
      expect(getFlowerById(emblem.flowerId), `${route} → ${emblem.flowerId}`).toBeDefined();
      expect(emblem.why.length).toBeGreaterThan(10);
    }
  });

  it("ne réutilise jamais la même fleur sur deux pages", () => {
    const ids = Object.values(PAGE_EMBLEM).map((emblem) => emblem.flowerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("renvoie null pour une route sans emblème", () => {
    expect(emblemFor("/route-inexistante")).toBeNull();
  });
});
