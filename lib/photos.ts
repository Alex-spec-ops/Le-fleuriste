import photosJson from "@/data/photos.json";
import type { Flower } from "@/lib/schemas/flower";
import type { FlowerPhoto, MediaLibrary, Photo, Video } from "@/lib/schemas/photo";

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

export type { FlowerPhoto, Photo, Video };

export function getFlowerPhoto(flowerId: string): FlowerPhoto | undefined {
  return LIBRARY.flowers[flowerId];
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
