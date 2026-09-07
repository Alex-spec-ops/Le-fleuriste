import { describe, expect, it } from "vitest";

import photosJson from "@/data/photos.json";
import { EVENT_SHOWCASE, SHOP_BOUQUETS } from "@/data/boutique";
import { getAllFlowers, getCatalogForClient } from "@/lib/flowers";
import pexelsLoader from "@/lib/pexels-loader";
import {
  colorPlaceholder,
  countIllustratedBouquets,
  countIllustratedFlowers,
  getBouquetPhoto,
  flowerPhotoAlt,
  getFlowerPhoto,
  getHomeHero,
  getHomePhotos,
  getHomeVideos,
  photoRefOf,
} from "@/lib/photos";
import { mediaLibrarySchema } from "@/lib/schemas/photo";

describe("photothèque", () => {
  it("valide data/photos.json avec le schéma Zod", () => {
    const result = mediaLibrarySchema.safeParse(photosJson);
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

  it("illustre chaque fleur du catalogue", () => {
    const missing = getAllFlowers()
      .filter((flower) => !getFlowerPhoto(flower.id))
      .map((flower) => flower.id);
    expect(missing).toEqual([]);
    expect(countIllustratedFlowers()).toBe(getAllFlowers().length);
  });

  it("n'attribue jamais deux fois la même photo", () => {
    // Deux cultivars voisins doivent rester distinguables : une photo
    // partagée laisserait croire à un doublon dans le catalogue.
    const ids = [
      ...getAllFlowers().map((flower) => getFlowerPhoto(flower.id)?.pexelsId),
      ...[...SHOP_BOUQUETS, ...EVENT_SHOWCASE].map(
        (composition) => getBouquetPhoto(composition.id)?.pexelsId,
      ),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("illustre chaque composition, sélection et réalisations", () => {
    const compositions = [...SHOP_BOUQUETS, ...EVENT_SHOWCASE];
    const missing = compositions
      .filter((composition) => !getBouquetPhoto(composition.id))
      .map((composition) => composition.id);
    expect(missing).toEqual([]);
    expect(countIllustratedBouquets()).toBe(compositions.length);
  });

  it("ne sert que des URL Pexels, sans paramètre de taille", () => {
    for (const flower of getAllFlowers()) {
      const photo = getFlowerPhoto(flower.id);
      expect(photo?.src.startsWith("https://images.pexels.com/")).toBe(true);
      expect(photo?.src).not.toContain("?");
    }
    for (const video of getHomeVideos()) {
      expect(video.src.startsWith("https://videos.pexels.com/")).toBe(true);
      expect(video.poster.startsWith("https://images.pexels.com/")).toBe(true);
    }
  });

  it("fournit de quoi monter le générique d'ouverture", () => {
    const hero = getHomeHero();
    // Un seul plan ne fait pas un montage.
    expect(hero.length).toBeGreaterThanOrEqual(2);
    expect(new Set(hero.map((shot) => shot.pexelsId)).size).toBe(hero.length);
    for (const shot of hero) {
      // Chaque plan dure plus longtemps que le temps d'écran qu'on lui donne.
      expect(shot.durationSeconds).toBeGreaterThanOrEqual(6);
      expect(shot.width).toBeGreaterThanOrEqual(1200);
    }
  });

  it("sépare les plans du héros des vidéos du mur d'images", () => {
    const heroIds = new Set(getHomeHero().map((shot) => shot.pexelsId));
    const wallIds = getHomeVideos().map((video) => video.pexelsId);
    expect(wallIds.filter((id) => heroIds.has(id))).toEqual([]);
  });

  it("crédite un photographe pour chaque média", () => {
    const media = [
      ...getAllFlowers().map((flower) => getFlowerPhoto(flower.id)),
      ...getHomePhotos(),
      ...getHomeVideos(),
      ...getHomeHero(),
    ];
    for (const item of media) {
      expect(item?.photographer.length).toBeGreaterThan(0);
      expect(item?.pageUrl.startsWith("https://www.pexels.com/")).toBe(true);
    }
  });
});

describe("chargeur d'images", () => {
  it("délègue le redimensionnement au CDN Pexels", () => {
    const url = new URL(
      pexelsLoader({ src: "https://images.pexels.com/photos/1/x.jpeg", width: 640 }),
    );
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("auto")).toBe("compress");
  });

  it("laisse intactes les adresses qui ne viennent pas de Pexels", () => {
    const local = "/illustrations/rose-avalanche.svg";
    expect(pexelsLoader({ src: local, width: 320 })).toBe(local);
  });

  it("borne la qualité demandée", () => {
    const low = new URL(
      pexelsLoader({ src: "https://images.pexels.com/photos/1/x.jpeg", width: 10, quality: 1 }),
    );
    expect(Number(low.searchParams.get("q"))).toBeGreaterThanOrEqual(40);
  });
});

describe("charge utile envoyée au navigateur", () => {
  it("joint une photo allégée à chaque fleur du catalogue client", () => {
    for (const flower of getCatalogForClient()) {
      expect(flower.photo?.src).toBeDefined();
      expect(flower.photo?.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("n'y expose pas le crédit photographe, inutile côté client", () => {
    const reference = photoRefOf("rose-avalanche");
    expect(reference).toBeDefined();
    expect(Object.keys(reference ?? {}).sort()).toEqual(["color", "src"]);
  });

  it("produit un fond de chargement lisible par le navigateur", () => {
    expect(colorPlaceholder("#162B30")).toMatch(/^data:image\/svg\+xml,/);
  });
});

describe("texte alternatif", () => {
  it("nomme la variété sans prétendre montrer le cultivar", () => {
    const alt = flowerPhotoAlt({ nameFr: "Rose Avalanche", colors: ["blanc"] });
    expect(alt).toContain("Rose Avalanche");
    expect(alt).toContain("illustration");
  });
});
