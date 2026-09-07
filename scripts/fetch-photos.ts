/**
 * Récupère sur Pexels une photo par fleur du catalogue, plus les vidéos et
 * photos d'ambiance de la page d'accueil, et écrit data/photos.json.
 *
 *   npm run photos:fetch              met à jour ce qui manque
 *   npm run photos:fetch -- --refresh reprend tout à zéro
 *   npm run photos:fetch -- --home    seulement l'accueil
 *
 * La clé n'est lue que par ce script, exécuté à la main : elle ne traverse
 * jamais le bundle et le site n'appelle pas Pexels à l'exécution.
 *
 * Ce que ce script ne peut pas faire : trouver la photo du cultivar exact.
 * Une banque d'images ne référence pas « Rosa 'Avalanche' », elle référence
 * des roses blanches. La requête est donc bâtie sur la catégorie et la
 * couleur dominante, ce qui donne une photo botaniquement juste — la bonne
 * fleur, la bonne couleur — mais pas la garantie du cultivar.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Category, Color } from "../lib/constants";
import { mediaLibrarySchema, type FlowerPhoto, type MediaLibrary } from "../lib/schemas/photo";
import type { Flower } from "../lib/schemas/flower";

const TARGET = resolve(process.cwd(), "data/photos.json");
const CATALOG = resolve(process.cwd(), "data/flowers.json");

/** Terme de recherche anglais par catégorie : Pexels n'indexe pas le français. */
const CATEGORY_TERM: Record<Category, string> = {
  Roses: "rose flower",
  Pivoines: "peony flower",
  Tulipes: "tulip flower",
  Renoncules: "ranunculus flower",
  Orchidées: "orchid flower",
  "Lys & Lilium": "lily flower",
  Dahlias: "dahlia flower",
  Chrysanthèmes: "chrysanthemum flower",
  Œillets: "carnation flower",
  Gerberas: "gerbera daisy flower",
  Hortensias: "hydrangea flower",
  "Fleurs de champ & champêtres": "wildflower meadow flower",
  "Fleurs séchées & stabilisées": "dried flower bouquet",
  "Feuillages & verdure": "eucalyptus foliage greenery",
  Branchages: "blossom branch",
  "Bulbes de printemps": "spring bulb flower",
  "Fleurs exotiques & tropicales": "tropical exotic flower",
  Graminées: "ornamental grass plume",
  "Plantes fleuries en pot": "potted flowering plant",
  "Aromatiques & herbes": "fresh herb plant",
};

const COLOR_TERM: Record<Color, string> = {
  blanc: "white",
  crème: "cream",
  ivoire: "ivory",
  jaune: "yellow",
  orange: "orange",
  corail: "coral",
  "rose pâle": "pale pink",
  "rose vif": "pink",
  fuchsia: "magenta",
  rouge: "red",
  bordeaux: "dark red burgundy",
  violet: "purple",
  lavande: "lavender",
  bleu: "blue",
  vert: "green",
  pêche: "peach",
  bicolore: "two tone bicolor",
};

/**
 * Filtre `color` de l'API, qui trie sur la teinte dominante réelle du cliché.
 * Le texte seul ne suffit pas : « lavender chrysanthemum » ramène des
 * chrysanthèmes blancs, parce que personne n'écrit « lavande » dans la
 * légende d'une photo. Valeurs nommées quand Pexels en propose une,
 * hexadécimal sinon.
 */
const PEXELS_COLOR: Record<Color, string | null> = {
  blanc: "white",
  crème: "#F0E4CE",
  ivoire: "#F4EDDF",
  jaune: "yellow",
  orange: "orange",
  corail: "#FF7F50",
  "rose pâle": "#F7C6D0",
  "rose vif": "pink",
  fuchsia: "#D6248A",
  rouge: "red",
  bordeaux: "#7B1E2B",
  violet: "violet",
  lavande: "#B57EDC",
  bleu: "blue",
  vert: "green",
  pêche: "#FFCBA4",
  // Une bicolore n'a pas de teinte dominante : la filtrer reviendrait à
  // n'en garder qu'une moitié.
  bicolore: null,
};

/**
 * Plans du montage d'ouverture, choisis à la main et repris par identifiant :
 * une recherche par mots-clés ne garantit ni l'enchaînement ni la cohérence
 * de lumière entre deux plans. Dans l'ordre : les mains qui nouent un bouquet,
 * l'atelier, la macro de pétales, la brassée de champêtres.
 */
const HERO_VIDEO_IDS = [5399933, 5399644, 6965643, 31916185] as const;

/**
 * Le montage n'affiche que six secondes par plan : inutile de télécharger de
 * l'UHD. 1280 px suffit au cadre du héros, même sur écran dense.
 */
const HERO_WIDTH = { min: 1200, max: 1400 };

const HOME_VIDEO_QUERIES = [
  "flowers blooming close up",
  "florist making bouquet",
  "flower shop",
] as const;

const HOME_PHOTO_QUERIES = [
  "florist flower shop interior",
  "hands wrapping flower bouquet",
  "flower market stall",
  "bouquet of fresh flowers on table",
] as const;

// --------------------------------------------------------------------- API

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  alt: string;
  src: { original: string };
};

type PexelsVideoFile = {
  quality: string | null;
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: { name: string; url: string };
  video_files: PexelsVideoFile[];
};

function readApiKey(): string {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const match = /^\s*(?:PEXELS_API_KEY|PEXELS)\s*=\s*(.+?)\s*$/m.exec(readFileSync(path, "utf8"));
    const key = match?.[1]?.replace(/^["']|["']$/g, "");
    if (key) return key;
  }
  throw new Error("Clé absente : ajoutez PEXELS_API_KEY=... dans .env.local");
}

const KEY = readApiKey();
let requests = 0;

async function pexels<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://api.pexels.com/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, { headers: { Authorization: KEY } });
    requests += 1;
    if (response.ok) return (await response.json()) as T;
    if (response.status === 429) {
      const wait = attempt * 5000;
      console.warn(`  quota atteint, pause ${wait / 1000} s…`);
      await new Promise((done) => setTimeout(done, wait));
      continue;
    }
    throw new Error(`Pexels ${response.status} sur ${url.pathname}?${url.searchParams}`);
  }
  throw new Error(`Pexels : 4 tentatives sans succès sur ${url.pathname}`);
}

/** Retire les paramètres de redimensionnement : les tailles sont dérivées à l'affichage. */
function baseSrc(original: string): string {
  const url = new URL(original);
  url.search = "";
  return url.toString();
}

/**
 * Nom d'auteur nettoyé : certains comptes Pexels contiennent des blancs
 * Unicode invisibles, qui ressortent en espace flottant avant la virgule
 * dans une liste de crédits.
 */
function cleanName(name: string): string {
  return name.replace(/[\s⠀​-‍﻿]+/g, " ").trim();
}

function toPhoto(photo: PexelsPhoto) {
  return {
    pexelsId: photo.id,
    src: baseSrc(photo.src.original),
    width: photo.width,
    height: photo.height,
    alt: photo.alt.slice(0, 300),
    avgColor: photo.avg_color.toUpperCase(),
    photographer: cleanName(photo.photographer),
    photographerUrl: photo.photographer_url,
    pageUrl: photo.url,
  };
}

// ------------------------------------------------------------------ fleurs

/**
 * Une photo de fleur doit être un portrait ou un carré : les cartes du
 * catalogue sont hautes, un paysage panoramique s'y recadre mal.
 */
function usablePortrait(photo: PexelsPhoto): boolean {
  const ratio = photo.width / photo.height;
  return ratio >= 0.6 && ratio <= 1.15 && photo.width >= 600;
}

/** Ce qui trahit un gros plan sur la fleur, seul cadrage utile en fiche produit. */
const CLOSE_UP = /\b(close[- ]?up|macro|bloom(ing|s)?|blossom|petals?|flower head)\b/i;

/** Ce qui trahit une scène : la fleur y est un détail parmi d'autres. */
const SCENE =
  /\b(wedding|bride|groom|city|street|urban|building|woman|man|girl|boy|person|people|hand|holding|shop|store|market|field|meadow|garden|park|vase|bouquet|arrangement|interior|table|window|gift|box)\b/i;

/**
 * Familles de teintes telles que les légendes les nomment.
 *
 * Le filtre `color` de l'API porte sur la couleur moyenne du cliché, feuillage
 * compris : une photo de chrysanthèmes violets sur fond de feuilles passe pour
 * verte. La légende, elle, nomme la fleur. Les deux signaux se complètent.
 */
const HUE_WORDS: Record<string, RegExp> = {
  blanc: /\b(white|ivory|cream)\b/i,
  jaune: /\b(yellow|golden)\b/i,
  orange: /\b(orange|coral|peach|apricot)\b/i,
  rose: /\b(pink|magenta|fuchsia)\b/i,
  rouge: /\b(red|crimson|scarlet|burgundy)\b/i,
  violet: /\b(purple|violet|lilac|lavender|mauve)\b/i,
  bleu: /\bblue\b/i,
  vert: /\bgreen(?!\s+(foliage|leaves|background|stems?|centers?))\b/i,
};

/** Famille de teinte visée par une couleur du catalogue. */
const COLOR_FAMILY: Record<Color, keyof typeof HUE_WORDS | null> = {
  blanc: "blanc",
  crème: "blanc",
  ivoire: "blanc",
  jaune: "jaune",
  orange: "orange",
  corail: "orange",
  "rose pâle": "rose",
  "rose vif": "rose",
  fuchsia: "rose",
  rouge: "rouge",
  bordeaux: "rouge",
  violet: "violet",
  lavande: "violet",
  bleu: "bleu",
  vert: "vert",
  pêche: "orange",
  bicolore: null,
};

/**
 * Note d'un candidat, la plus basse d'abord.
 *
 * Deux critères, dans cet ordre : la légende nomme-t-elle la bonne couleur, et
 * s'agit-il d'un gros plan sur la fleur plutôt que d'une scène. La description
 * fournie par Pexels est le seul indice lisible sans télécharger l'image, mais
 * elle suffit à écarter un bouquet posé sur une table ou un dahlia rose quand
 * on cherchait un bordeaux.
 */
function scorePhoto(photo: PexelsPhoto, family: keyof typeof HUE_WORDS | null): number {
  let score = 0;

  if (family) {
    if (HUE_WORDS[family]?.test(photo.alt)) score -= 4;
    else if (Object.entries(HUE_WORDS).some(([name, re]) => name !== family && re.test(photo.alt))) {
      score += 4;
    }
  }

  if (CLOSE_UP.test(photo.alt)) score -= 2;
  if (SCENE.test(photo.alt)) score += 3;
  if (photo.alt.trim().length === 0) score += 1;
  // Un portrait très allongé perd ses bords dans un cadre presque carré.
  score += Math.abs(photo.width / photo.height - 0.82);
  return score;
}

/** Comparateur déterministe : à note égale, l'identifiant tranche. */
function ranked(family: keyof typeof HUE_WORDS | null) {
  return (a: PexelsPhoto, b: PexelsPhoto) =>
    scorePhoto(a, family) - scorePhoto(b, family) || a.id - b.id;
}

async function search(query: string, color: string | null): Promise<PexelsPhoto[]> {
  const page = await pexels<{ photos: PexelsPhoto[] }>("v1/search", {
    query,
    per_page: "80",
    orientation: "portrait",
    size: "medium",
    ...(color ? { color } : {}),
  });
  return page.photos.filter(usablePortrait);
}

/**
 * Les clichés dont la teinte dominante correspond d'abord, complétés au
 * besoin par la recherche textuelle seule : mieux vaut une photo un peu hors
 * teinte que pas de photo du tout, et le filtre couleur vide certains croisements
 * (les pivoines bordeaux, par exemple).
 */
async function searchFlowerPhotos(
  query: string,
  color: string | null,
  family: keyof typeof HUE_WORDS | null,
  needed: number,
): Promise<PexelsPhoto[]> {
  const byRank = ranked(family);
  const tinted = await search(query, color);
  if (tinted.length >= needed || color === null) return tinted.sort(byRank);

  await new Promise((done) => setTimeout(done, 120));
  const seen = new Set(tinted.map((photo) => photo.id));
  const fallback = (await search(query, null)).filter((photo) => !seen.has(photo.id));
  // Les clichés à la bonne teinte restent devant : le repli ne fait que
  // compléter, il ne concurrence pas.
  return [...tinted.sort(byRank), ...fallback.sort(byRank)];
}

type Group = {
  query: string;
  color: string | null;
  family: keyof typeof HUE_WORDS | null;
  flowers: Flower[];
};

function groupFlowers(flowers: readonly Flower[]): Group[] {
  const groups = new Map<string, Group>();
  for (const flower of flowers) {
    const color = flower.colors[0];
    if (!color) continue;
    const query = `${COLOR_TERM[color]} ${CATEGORY_TERM[flower.category]}`;
    const group = groups.get(query) ?? {
      query,
      color: PEXELS_COLOR[color],
      family: COLOR_FAMILY[color],
      flowers: [],
    };
    group.flowers.push(flower);
    groups.set(query, group);
  }
  // Ordre stable : deux exécutions attribuent les mêmes photos aux mêmes fleurs.
  for (const group of groups.values()) group.flowers.sort((a, b) => a.id.localeCompare(b.id));
  return [...groups.values()].sort((a, b) => a.query.localeCompare(b.query));
}

async function fetchFlowerPhotos(
  flowers: readonly Flower[],
  existing: Record<string, FlowerPhoto>,
): Promise<Record<string, FlowerPhoto>> {
  const groups = groupFlowers(flowers);
  const assigned: Record<string, FlowerPhoto> = {};
  // Une photo ne sert qu'une fois : deux cultivars voisins doivent rester
  // distinguables, sinon la fiche produit ment sur la variété.
  const used = new Set<number>();

  for (const [index, group] of groups.entries()) {
    const missing = group.flowers.filter((flower) => !existing[flower.id]);
    for (const flower of group.flowers) {
      const kept = existing[flower.id];
      if (kept && !used.has(kept.pexelsId)) {
        assigned[flower.id] = kept;
        used.add(kept.pexelsId);
      }
    }
    if (missing.length === 0) continue;

    process.stdout.write(
      `[${String(index + 1).padStart(3)}/${groups.length}] ${group.query} — ${missing.length} à trouver… `,
    );
    // On demande plus large que le strict nécessaire : les photos déjà prises
    // par un autre groupe sont écartées ensuite.
    const candidates = await searchFlowerPhotos(
      group.query,
      group.color,
      group.family,
      missing.length + 8,
    );
    let cursor = 0;
    let placed = 0;
    for (const flower of missing) {
      while (cursor < candidates.length && used.has(candidates[cursor]!.id)) cursor += 1;
      const candidate = candidates[cursor];
      if (!candidate) break;
      cursor += 1;
      used.add(candidate.id);
      assigned[flower.id] = { ...toPhoto(candidate), query: group.query };
      placed += 1;
    }
    console.log(`${placed} attribuée(s) sur ${candidates.length} résultats`);
    if (placed < missing.length) {
      console.warn(`  ! ${missing.length - placed} fleur(s) sans photo pour « ${group.query} »`);
    }
    await new Promise((done) => setTimeout(done, 120));
  }

  return assigned;
}

// ----------------------------------------------------------------- accueil

/** Le plus petit fichier qui reste net en pleine largeur : ~1280 px. */
function pickVideoFile(video: PexelsVideo): PexelsVideoFile | undefined {
  return video.video_files
    .filter((file) => file.file_type === "video/mp4" && (file.width ?? 0) >= 1200)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0];
}

function toVideo(video: PexelsVideo, file: PexelsVideoFile): MediaLibrary["home"]["videos"][number] {
  return {
    pexelsId: video.id,
    src: file.link.split("?")[0] ?? file.link,
    width: file.width ?? video.width,
    height: file.height ?? video.height,
    durationSeconds: video.duration,
    poster: baseSrc(video.image),
    photographer: cleanName(video.user.name),
    photographerUrl: video.user.url,
    pageUrl: video.url,
  };
}

/** Les plans du montage, repris un par un à leur identifiant. */
async function fetchHero(): Promise<MediaLibrary["home"]["hero"]> {
  const hero: MediaLibrary["home"]["hero"] = [];
  for (const id of HERO_VIDEO_IDS) {
    process.stdout.write(`plan ${id}… `);
    const video = await pexels<PexelsVideo>(`videos/videos/${id}`, {});
    const file = video.video_files
      .filter(
        (candidate) =>
          candidate.file_type === "video/mp4" &&
          (candidate.width ?? 0) >= HERO_WIDTH.min &&
          (candidate.width ?? 0) <= HERO_WIDTH.max,
      )
      .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0];
    if (!file) {
      console.log("aucun fichier à la bonne définition");
      continue;
    }
    hero.push(toVideo(video, file));
    console.log(`${video.duration} s, ${file.width}×${file.height}, ${video.user.name}`);
    await new Promise((done) => setTimeout(done, 120));
  }
  return hero;
}

async function fetchHome(): Promise<MediaLibrary["home"]> {
  const hero = await fetchHero();
  const videos: MediaLibrary["home"]["videos"] = [];
  const seenVideos = new Set<number>();

  for (const query of HOME_VIDEO_QUERIES) {
    process.stdout.write(`vidéo « ${query} »… `);
    const page = await pexels<{ videos: PexelsVideo[] }>("videos/search", {
      query,
      per_page: "24",
      orientation: "landscape",
      size: "medium",
    });
    const chosen = page.videos.find((video) => {
      if (seenVideos.has(video.id)) return false;
      if (video.duration < 5 || video.duration > 40) return false;
      return pickVideoFile(video) !== undefined;
    });
    if (!chosen) {
      console.log("aucune vidéo exploitable");
      continue;
    }
    const file = pickVideoFile(chosen);
    if (!file) continue;
    seenVideos.add(chosen.id);
    videos.push(toVideo(chosen, file));
    console.log(`${chosen.duration} s, ${file.width}×${file.height}`);
    await new Promise((done) => setTimeout(done, 120));
  }

  const photos: MediaLibrary["home"]["photos"] = [];
  const seenPhotos = new Set<number>();
  for (const query of HOME_PHOTO_QUERIES) {
    process.stdout.write(`photo « ${query} »… `);
    const page = await pexels<{ photos: PexelsPhoto[] }>("v1/search", {
      query,
      per_page: "40",
      orientation: "landscape",
      size: "medium",
    });
    const chosen = page.photos.filter((photo) => !seenPhotos.has(photo.id)).slice(0, 2);
    for (const photo of chosen) {
      seenPhotos.add(photo.id);
      photos.push(toPhoto(photo));
    }
    console.log(`${chosen.length} retenue(s)`);
    await new Promise((done) => setTimeout(done, 120));
  }

  return { hero, videos, photos };
}

// -------------------------------------------------------------------- main

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const refresh = args.has("--refresh");
  const homeOnly = args.has("--home");

  const flowers = JSON.parse(readFileSync(CATALOG, "utf8")) as Flower[];
  const previous =
    !refresh && existsSync(TARGET)
      ? (JSON.parse(readFileSync(TARGET, "utf8")) as Partial<MediaLibrary>)
      : {};

  const knownIds = new Set(flowers.map((flower) => flower.id));
  const kept: Record<string, FlowerPhoto> = {};
  for (const [id, photo] of Object.entries(previous.flowers ?? {})) {
    if (knownIds.has(id)) kept[id] = photo;
  }

  const flowerPhotos = homeOnly ? kept : await fetchFlowerPhotos(flowers, kept);
  // On refait l'accueil si la bibliothèque date d'avant le montage.
  const home = homeOnly || !previous.home?.hero ? await fetchHome() : previous.home;

  const library: MediaLibrary = {
    fetchedAt: new Date().toISOString(),
    flowers: Object.fromEntries(
      Object.entries(flowerPhotos).sort(([a], [b]) => a.localeCompare(b)),
    ),
    home,
  };

  const result = mediaLibrarySchema.safeParse(library);
  if (!result.success) {
    console.error("Bibliothèque invalide :");
    for (const issue of result.error.issues.slice(0, 20)) {
      console.error(`  [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }

  writeFileSync(TARGET, `${JSON.stringify(result.data, null, 1)}\n`, "utf8");

  const withoutPhoto = flowers.filter((flower) => !result.data.flowers[flower.id]);
  console.log(
    `\n${Object.keys(result.data.flowers).length}/${flowers.length} fleurs illustrées · ` +
      `${result.data.home.videos.length} vidéos · ${result.data.home.photos.length} photos d'accueil · ` +
      `${requests} requêtes`,
  );
  if (withoutPhoto.length > 0) {
    console.warn(`Sans photo : ${withoutPhoto.map((flower) => flower.id).join(", ")}`);
  }
}

void main();
