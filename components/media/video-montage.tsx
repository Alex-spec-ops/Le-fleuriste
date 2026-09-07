"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import pexelsLoader from "@/lib/pexels-loader";
import type { Video } from "@/lib/photos";

/**
 * Enchaînement de plusieurs plans en fondu.
 *
 * Une banque d'images ne vend pas de montages : chaque fichier Pexels est un
 * plan continu. Le montage se fait donc ici, en superposant les clips et en
 * ne laissant qu'un seul visible à la fois — mains qui nouent un bouquet,
 * atelier, macro de pétales, brassée de champêtres.
 *
 * Les clips ne sont pas chargés d'un bloc : seul celui à l'écran et le
 * suivant le sont, sinon la page d'accueil téléchargerait une dizaine de
 * mégaoctets avant d'afficher quoi que ce soit.
 *
 * `prefers-reduced-motion` fige l'ensemble sur le premier plan.
 */
export function VideoMontage({
  shots,
  shotSeconds = 6,
  className,
  posterWidth = 1280,
}: {
  shots: readonly Video[];
  /** Durée d'un plan avant l'enchaînement. */
  shotSeconds?: number;
  className?: string;
  posterWidth?: number;
}) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  const count = shots.length;

  // Le minuteur mène la danse. Rien ne dépend de la durée réelle du clip :
  // ils sont tous plus longs qu'un plan, et on n'en montre que le début.
  useEffect(() => {
    if (reduced || count < 2) return;
    const timer = setInterval(() => {
      setCurrent((index) => (index + 1) % count);
    }, shotSeconds * 1000);
    return () => clearInterval(timer);
  }, [reduced, count, shotSeconds]);

  // Pilotage des éléments <video>, effet de bord assumé : React ne sait pas
  // exprimer « joue depuis le début » autrement qu'en touchant le DOM.
  useEffect(() => {
    if (reduced) {
      for (const element of refs.current) element?.pause();
      return;
    }

    const active = refs.current[current];
    if (active) {
      active.preload = "auto";
      active.currentTime = 0;
      void active.play().catch(() => undefined);
    }

    // On réveille le plan suivant pour que l'enchaînement ne bute pas sur un
    // écran noir le temps du téléchargement.
    const next = refs.current[(current + 1) % Math.max(count, 1)];
    if (next && next !== active) {
      next.preload = "auto";
      next.load();
    }

    for (const [index, element] of refs.current.entries()) {
      if (index !== current && element) element.pause();
    }
  }, [current, reduced, count]);

  return (
    <div className={`relative overflow-hidden bg-secondary ${className ?? ""}`}>
      {shots.map((shot, index) => (
        <video
          key={shot.pexelsId}
          ref={(element) => {
            refs.current[index] = element;
          }}
          poster={pexelsLoader({ src: shot.poster, width: posterWidth })}
          muted
          loop
          playsInline
          // Seul le premier plan se charge d'emblée ; les autres sont armés
          // par l'effet, juste avant leur tour.
          preload={index === 0 ? "auto" : "none"}
          aria-hidden
          tabIndex={-1}
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000 motion-reduce:transition-none"
          style={{ opacity: index === current ? 1 : 0 }}
        >
          <source src={shot.src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}
