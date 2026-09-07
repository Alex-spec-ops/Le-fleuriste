import Image from "next/image";

import { colorPlaceholder, type Photo, type Video } from "@/lib/photos";

/**
 * Affichage des médias Pexels et de leur crédit.
 *
 * La licence Pexels n'impose pas la mention, mais leurs conditions la
 * recommandent explicitement et un site marchand qui vit d'images empruntées
 * se doit de nommer ses auteurs. Chaque photo affichée porte donc son crédit,
 * ou le renvoie à une liste groupée quand elles sont nombreuses.
 */

type Credit = Pick<Photo, "photographer" | "photographerUrl" | "pageUrl">;

export function PhotoCredit({ credit, className }: { credit: Credit; className?: string }) {
  return (
    <p className={`text-[0.7rem] text-muted-soft ${className ?? ""}`}>
      Photo{" "}
      <a
        href={credit.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        {credit.photographer}
      </a>{" "}
      sur{" "}
      <a
        href={credit.pageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Pexels
      </a>
    </p>
  );
}

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

export type { Credit, Photo, Video };
