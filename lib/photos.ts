import photosJson from "@/data/photos.json";
import type { Flower } from "@/lib/schemas/flower";
import type { SourcedPhoto, MediaLibrary, Photo, Video } from "@/lib/schemas/photo";

/**
 * Couche d'accès aux médias, sur le modèle de `lib/flowers.ts`.
 *
 * Le fichier data/photos.json est produit hors ligne par `npm run photos:fetch`
 * et versionné : le site n'appelle jamais l'API Pexels, ne dépend pas de la
 * clé pour s'afficher, et deux visiteurs voient la même photo pour une fleur
 * donnée. Remplacer la banque d'images revient à réécrire ce module et le
 * script, sans toucher aux pages.
 *
 * Attention : ce module importe 152 Ko de JSON. Il ne doit être appelé que
 * depuis des composants serveur ; ce qui doit atteindre le navigateur passe
 * par `photoRefOf`, qui n'en garde que le strict nécessaire.
 */

const LIBRARY = photosJson as MediaLibrary;

export type { SourcedPhoto, Photo, Video };

export function getFlowerPhoto(flowerId: string): SourcedPhoto | undefined {
  return LIBRARY.flowers[flowerId];
}

/**
 * Photo d'une composition : bouquet de la sélection ou réalisation
 * événementielle.
 *
 * Elle en montre l'allure — palette, style, format, emballage —, jamais la
 * liste exacte des tiges : aucune banque d'images ne référence « 5 roses
 * Peach Avalanche et 3 œillets Marimo ». C'est pourquoi les cartes gardent la
 * composition écrite juste en dessous, elle seule fait foi.
 */
export function getBouquetPhoto(bouquetId: string): SourcedPhoto | undefined {
  return LIBRARY.bouquets[bouquetId];
}

/** Nombre de compositions illustrées, pour les tests et le diagnostic. */
export function countIllustratedBouquets(): number {
  return Object.keys(LIBRARY.bouquets).length;
}

/**
 * Ce qu'une vidéo livre au navigateur : de quoi la lire, rien de plus.
 *
 * Le crédit ne suit pas. Les auteurs des vidéos ne sont pas nommés à
 * l'écran ; les laisser dans les propriétés sérialisées de la page les
 * rendrait quand même lisibles dans le source, ce qui reviendrait au même.
 */
export type VideoSource = Pick<Video, "pexelsId" | "src" | "poster" | "width" | "height">;

export function videoSource(video: Video): VideoSource {
  return {
    pexelsId: video.pexelsId,
    src: video.src,
    poster: video.poster,
    width: video.width,
    height: video.height,
  };
}

/** Plans du montage d'ouverture, dans l'ordre de passage. */
export function getHomeHero(): readonly Video[] {
  return LIBRARY.home.hero;
}

export function getHomeVideos(): readonly Video[] {
  return LIBRARY.home.videos;
}

export function getHomePhotos(): readonly Photo[] {
  return LIBRARY.home.photos;
}

/** Nombre de fleurs effectivement illustrées, pour les tests et le diagnostic. */
export function countIllustratedFlowers(): number {
  return Object.keys(LIBRARY.flowers).length;
}

/**
 * Version minimale envoyée au navigateur : l'adresse et la couleur moyenne.
 * Le crédit photographe reste côté serveur, où il est réellement affiché.
 */
export type PhotoRef = {
  src: string;
  /** Couleur moyenne de la photo, affichée pendant le chargement. */
  color: string;
};

export function photoRefOf(flowerId: string): PhotoRef | undefined {
  const photo = LIBRARY.flowers[flowerId];
  if (!photo) return undefined;
  return { src: photo.src, color: photo.avgColor };
}

/**
 * Fond uni servant de `blurDataURL`. Next exige une URL de données ; un SVG
 * d'un pixel évite d'embarquer une vignette encodée par photo.
 */
export function colorPlaceholder(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="${color}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Texte alternatif d'une photo de fleur.
 *
 * La photo illustre l'espèce et la couleur, pas le cultivar : une banque
 * d'images ne référence pas « Rosa 'Avalanche' ». On nomme donc la variété du
 * catalogue, qui est l'information utile, sans prétendre que le cliché la
 * montre exactement.
 */
export function flowerPhotoAlt(flower: Pick<Flower, "nameFr" | "colors">): string {
  return `${flower.nameFr}, photo d'illustration (teinte ${flower.colors[0]})`;
}
