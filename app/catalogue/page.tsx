import type { Metadata } from "next";

import { CatalogueBrowser } from "@/components/catalogue/catalogue-browser";
import { PageHeader } from "@/components/site/page-header";
import { getCatalogForClient, getCategorySummaries } from "@/lib/flowers";

export const metadata: Metadata = {
  title: "Le catalogue des fleurs",
  description:
    "Toutes les variétés travaillées à l'atelier : cultivar, saison réelle, tenue en vase, prix à la tige, risque allergène et toxicité pour les animaux.",
  alternates: { canonical: "/catalogue" },
};

export default function CataloguePage() {
  const flowers = getCatalogForClient();
  const categories = getCategorySummaries();

  return (
    <>
      <PageHeader
        eyebrow="Le catalogue"
        title="Toutes les fleurs de l'atelier"
        lead={`${flowers.length} variétés, avec pour chacune sa saison réelle, sa tenue en vase, son prix à l'unité et ses précautions. Cliquez sur une fleur pour l'ajouter à votre bouquet.`}
      />
      <CatalogueBrowser flowers={flowers} categories={categories} />
    </>
  );
}
