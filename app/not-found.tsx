import Link from "next/link";

import { EmptySprig } from "@/components/ornament/botanical";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-28 text-center sm:px-8">
      <EmptySprig className="mb-6 h-28 w-28" />
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-terracotta-strong">
        Page introuvable
      </p>
      <h1 className="heading-display mt-4 text-4xl sm:text-5xl">
        Cette page a fané
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Le lien que vous avez suivi ne mène nulle part. Le catalogue, lui, est
        toujours là.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/catalogue" />}>
          Voir le catalogue
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          variant="outline"
        >
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
