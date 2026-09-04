import type { Metadata } from "next";
import { Suspense } from "react";

import { Composer } from "@/components/composer/composer";
import { PageHeader } from "@/components/site/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogForClient, getCategorySummaries } from "@/lib/flowers";

export const metadata: Metadata = {
  title: "Composer votre bouquet",
  description:
    "Choisissez vos fleurs, voyez le bouquet se dessiner et le prix se mettre à jour à chaque geste. Sans engagement, avec un devis à la clé.",
  alternates: { canonical: "/composer" },
};

function ComposerFallback() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Skeleton className="h-[54vh] min-h-80 w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-[40vh] w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function ComposerPage() {
  const flowers = getCatalogForClient();
  const categories = getCategorySummaries();

  return (
    <>
      <PageHeader
        route="/composer"
        eyebrow="Le composeur"
        title="Composez votre bouquet"
        lead="Ajoutez des fleurs, le bouquet se dessine et le prix suit. Rien n'est commandé tant que vous ne nous l'avez pas envoyé."
      />
      <Suspense fallback={<ComposerFallback />}>
        <Composer flowers={flowers} categories={categories} />
      </Suspense>
    </>
  );
}
