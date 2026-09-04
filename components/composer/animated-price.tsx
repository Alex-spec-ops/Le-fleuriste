"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { formatEuro } from "@/lib/pricing";

/**
 * Compteur qui monte ou descend jusqu'au nouveau montant.
 * Désactivé si l'utilisateur préfère moins d'animations : le chiffre change
 * alors d'un coup, ce qui reste parfaitement lisible.
 */
export function AnimatedPrice({
  value,
  className,
  durationMs = 420,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(value);
  const frame = useRef<number | null>(null);
  const origin = useRef(value);

  useEffect(() => {
    if (reduced) return;

    const from = origin.current;
    const delta = value - from;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setAnimated(from + delta * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        origin.current = value;
        frame.current = null;
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      origin.current = value;
    };
  }, [value, durationMs, reduced]);

  const displayed = reduced ? value : animated;

  return (
    <span className={className}>
      {/* La valeur exacte est annoncée aux lecteurs d'écran, pas l'animation. */}
      <span aria-hidden>{formatEuro(displayed)}</span>
      <span className="sr-only" aria-live="polite">
        Total : {formatEuro(value)}
      </span>
    </span>
  );
}
