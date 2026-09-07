"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import pexelsLoader from "@/lib/pexels-loader";
import type { Video } from "@/lib/photos";

/**
 * Vidéo d'ambiance en lecture automatique.
 *
 * Deux règles la gouvernent, toutes deux d'accessibilité :
 *   — `prefers-reduced-motion` coupe la lecture et laisse l'image fixe, comme
 *     partout ailleurs sur le site ;
 *   — une animation qui dure plus de cinq secondes doit pouvoir être arrêtée
 *     (WCAG 2.2.2), d'où le bouton, visible et non pas seulement au survol.
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
  const [playing, setPlaying] = useState(false);

  // L'effet ne fait que piloter l'élément ; l'état, lui, est mis à jour par
  // les événements `play` et `pause` de la vidéo. C'est elle qui sait si elle
  // joue — un navigateur peut refuser la lecture automatique sans prévenir.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced) {
      element.pause();
      return;
    }
    void element.play().catch(() => undefined);
  }, [reduced]);

  const toggle = () => {
    const element = ref.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  };

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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-hidden
        tabIndex={-1}
        className="size-full object-cover"
      >
        <source src={video.src} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mettre la vidéo en pause" : "Lancer la vidéo"}
        className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4 translate-x-px" aria-hidden />
        )}
      </button>
    </div>
  );
}

