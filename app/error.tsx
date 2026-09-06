"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { SHOP } from "@/lib/shop";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] erreur de rendu", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-28 text-center sm:px-8">
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-poppy">
        Incident technique
      </p>
      <h1 className="heading-display mt-4 text-4xl sm:text-5xl">
        Quelque chose s&apos;est cassé
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Votre composition et votre devis sont conservés dans ce navigateur :
        vous ne perdez rien en réessayant.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button
          nativeButton={false}
          render={<a href={`tel:${SHOP.phoneHref}`} />}
          variant="outline"
        >
          Appeler la boutique
        </Button>
      </div>
      {error.digest ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Référence technique : {error.digest}
        </p>
      ) : null}
    </div>
  );
}
