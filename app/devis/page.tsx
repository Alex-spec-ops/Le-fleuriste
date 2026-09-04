import type { Metadata } from "next";
import { Suspense } from "react";

import { QuoteWizard } from "@/components/devis/quote-wizard";
import { PageHeader } from "@/components/site/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogForClient } from "@/lib/flowers";

export const metadata: Metadata = {
  title: "Devis événementiel",
  description:
    "Mariage, baptême, séminaire ou funérailles : obtenez un devis floral détaillé et chiffré en quelques minutes, avec une fourchette de prix honnête.",
  alternates: { canonical: "/devis" },
};

export default function DevisPage() {
  const flowers = getCatalogForClient();

  return (
    <>
      <PageHeader
        route="/devis"
        eyebrow="Devis événementiel"
        title="Chiffrons votre événement"
        lead="Une question par écran, cinq minutes, et vous repartez avec un devis détaillé en PDF. Rien n'est engageant : c'est une base de discussion."
      />
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-3xl space-y-4 px-5 sm:px-8">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        }
      >
        <QuoteWizard flowers={flowers} />
      </Suspense>
    </>
  );
}
