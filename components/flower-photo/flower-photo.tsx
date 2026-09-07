import Image from "next/image";

import { FlowerThumb } from "@/components/flower-svg/flower-svg";
import type { FlowerArtInput } from "@/lib/flower-art";
import { colorPlaceholder, type PhotoRef } from "@/lib/photos";

/**
 * Photo d'une fleur du catalogue.
 *
 * La photo vient de la bibliothèque Pexels constituée hors ligne. Si une
 * fleur n'y figure pas — bibliothèque pas encore régénérée après un ajout au
 * catalogue —, on retombe sur l'illustration vectorielle plutôt que d'afficher
 * un trou : le site reste complet sans dépendre de la banque d'images.
 */

type PhotoInput = FlowerArtInput & {
  nameFr: string;
  photo?: PhotoRef;
};

type FlowerPhotoProps = {
  flower: PhotoInput;
  /** Texte alternatif. Vide, l'image est décorative (le nom est déjà à côté). */
  alt?: string;
  /** Tailles rendues, transmises à `sizes` : évite de charger du 4000 px. */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * Photo recadrée qui remplit son conteneur. Le parent doit être positionné
 * (`relative`) et donner une hauteur : c'est lui qui décide du cadrage.
 */
export function FlowerPhoto({
  flower,
  alt = "",
  sizes,
  className,
  priority = false,
}: FlowerPhotoProps) {
  if (!flower.photo) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <FlowerThumb flower={flower} label={alt || undefined} className="max-h-full w-auto p-4" />
      </div>
    );
  }

  return (
    <Image
      src={flower.photo.src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={colorPlaceholder(flower.photo.color)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

/**
 * Pastille ronde de la liste du composeur. Taille fixe : l'image est petite,
 * on demande exactement la largeur nécessaire plutôt qu'un jeu de tailles.
 */
export function FlowerPhotoThumb({
  flower,
  size = 40,
  className,
}: {
  flower: PhotoInput;
  size?: number;
  className?: string;
}) {
  // L'arrondi vient de l'appelant quand il en donne un : deux classes
  // `rounded-*` sur le même élément se départagent par l'ordre de la
  // feuille de style, pas par celui de l'attribut.
  const shell = `relative block overflow-hidden bg-secondary ${className ?? "rounded-full"}`;

  if (!flower.photo) {
    return (
      <span className={shell} style={{ width: size, height: size }}>
        <FlowerThumb flower={flower} className="size-full" />
      </span>
    );
  }

  return (
    <span className={shell} style={{ width: size, height: size }}>
      <Image
        src={flower.photo.src}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        placeholder="blur"
        blurDataURL={colorPlaceholder(flower.photo.color)}
        className="size-full object-cover"
      />
    </span>
  );
}
