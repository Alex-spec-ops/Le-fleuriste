/**
 * Chargeur d'images de `next/image` (déclaré dans next.config.ts).
 *
 * Pexels sert déjà ses images depuis un CDN capable de redimensionner à la
 * volée. On lui délègue le travail au lieu de faire repasser chaque photo par
 * l'optimiseur de Next : une transformation de moins, et rien à télécharger
 * côté serveur. Les autres URL — nos SVG de /public et /illustrations — sont
 * renvoyées telles quelles.
 */

type LoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

const PEXELS_IMAGES = "https://images.pexels.com/";

export default function pexelsLoader({ src, width, quality }: LoaderArgs): string {
  if (!src.startsWith(PEXELS_IMAGES)) return src;

  const url = new URL(src);
  url.searchParams.set("auto", "compress");
  url.searchParams.set("cs", "tinysrgb");
  url.searchParams.set("w", String(width));
  // Pexels plafonne la qualité à 100 ; en deçà de 40 le grain devient visible
  // sur les pétales, qui sont presque toujours en dégradé.
  url.searchParams.set("q", String(Math.min(100, Math.max(40, quality ?? 74))));
  return url.toString();
}
