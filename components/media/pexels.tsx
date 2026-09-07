import Image from "next/image";

import { colorPlaceholder, type Photo, type Video } from "@/lib/photos";

/**
 * Affichage des photos Pexels.
 *
 * Aucun crédit n'accompagne les images : le pied de page mentionne une
 * seule fois leur origine et leur statut d'illustration, plutôt que de
 * répéter une légende sous chaque fleur.
 */

/** Photo qui remplit son conteneur : le parent doit être `relative` et dimensionné. */
export function PexelsImage({
  photo,
  alt,
  sizes,
  className,
  priority = false,
}: {
  photo: Photo;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={photo.src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={colorPlaceholder(photo.avgColor)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

export type { Photo, Video };
