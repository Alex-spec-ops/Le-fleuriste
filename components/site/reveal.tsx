"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Apparition en fondu au défilement.
 * L'élément est visible par défaut si l'observateur n'est pas disponible ou
 * si l'utilisateur préfère moins d'animations : le contenu ne dépend jamais
 * du JavaScript pour être lisible.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      element.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          window.setTimeout(() => {
            element.dataset.visible = "true";
          }, delayMs);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} className={`reveal ${className ?? ""}`}>
      {children}
    </div>
  );
}
