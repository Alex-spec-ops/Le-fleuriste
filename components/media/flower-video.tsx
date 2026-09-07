"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import pexelsLoader from "@/lib/pexels-loader";
import type { Video } from "@/lib/photos";

/**
 * Vidéo d'ambiance en lecture automatique.
 *
 * `prefers-reduced-motion` coupe la lecture et laisse l'image fixe, comme
 * partout ailleurs sur le site. C'est le seul moyen d'arrêter le mouvement :
 * le bouton de pause a été retiré à la demande. WCAG 2.2.2 demande qu'une
 * animation de plus de cinq secondes puisse être stoppée ; sans commande
 * visible, seuls les visiteurs ayant réglé leur système sont servis.
 *
 * La vidéo est muette et purement décorative : elle ne porte aucune
 * information que le texte alentour ne donne pas, donc pas de piste audio à
 * sous-titrer.
 */
export function FlowerVideo({
  video,
  className,
  posterWidth = 1280,
}: {
  video: Video;
  className?: string;
  /** Largeur demandée au CDN pour l'image d'attente. */
  posterWidth?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced) {
      element.pause();
      return;
    }
    // Un navigateur peut refuser la lecture automatique : on retombe alors
    // sur l'affiche, sans erreur non traitée dans la console.
    void element.play().catch(() => undefined);
  }, [reduced]);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <video
        ref={ref}
        // `poster` reste l'image affichée tant que rien n'est décodé, et
        // l'unique visuel quand l'utilisateur a demandé moins d'animations.
        poster={pexelsLoader({ src: video.poster, width: posterWidth })}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
        className="size-full object-cover"
      >
        <source src={video.src} type="video/mp4" />
      </video>
    </div>
  );
}

