import { SHOP } from "@/lib/shop";
import type { Flower } from "@/lib/schemas/flower";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Contenu entièrement produit par l'application, jamais saisi par un tiers.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Fiche établissement, présente sur toutes les pages. */
export function LocalBusinessJsonLd() {
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressLocality: SHOP.city,
    postalCode: SHOP.postalCode,
    addressCountry: "FR",
  };
  if (SHOP.streetAddress) address.streetAddress = SHOP.streetAddress;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Florist",
        name: SHOP.name,
        description: `Artisan fleuriste à ${SHOP.city} ${SHOP.district}. Bouquets, mariages et événements.`,
        url: SHOP.siteUrl,
        telephone: SHOP.phoneHref,
        email: SHOP.email,
        address,
        areaServed: { "@type": "City", name: SHOP.city },
        openingHoursSpecification: SHOP.hours
          .filter((day) => day.opens !== null && day.closes !== null)
          .map((day) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${day.schemaDay}`,
            opens: day.opens,
            closes: day.closes,
          })),
        priceRange: "€€",
      }}
    />
  );
}

/** Fiche produit d'une fleur du catalogue. */
export function FlowerJsonLd({ flower }: { flower: Flower }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: flower.nameFr,
        alternateName: flower.nameLatin,
        description: flower.description,
        category: flower.category,
        image: `${SHOP.siteUrl}${flower.imageUrl}`,
        brand: { "@type": "Brand", name: SHOP.name },
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: flower.pricePerStem.toFixed(2),
          availability: "https://schema.org/InStock",
          url: `${SHOP.siteUrl}/catalogue/${flower.id}`,
          seller: { "@type": "Organization", name: SHOP.name },
        },
      }}
    />
  );
}
