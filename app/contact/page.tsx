import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/contact-form";
import { PetalMark } from "@/components/ornament/botanical";
import { PageHeader } from "@/components/site/page-header";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Coordonnées, horaires et formulaire de contact de LE Fleuriste, artisan fleuriste dans le 10ᵉ arrondissement de Paris.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        route="/contact"
        eyebrow="Contact"
        title="Écrivez-nous, passez, appelez"
        lead="Pour une commande simple, le téléphone reste le plus rapide. Pour un événement, le formulaire de devis nous fait gagner un échange."
      />

      <div className="mx-auto grid w-full max-w-5xl gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="sr-only">Formulaire de contact</h2>
          <ContactForm />
        </section>

        <aside className="space-y-8">
          <section>
            <h2 className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">
              <PetalMark className="text-leaf" />
              Coordonnées
            </h2>
            <address className="mt-3 space-y-1.5 text-sm not-italic">
              <p className="font-heading text-lg not-italic">{SHOP.name}</p>
              <p>
                {SHOP.postalCode} {SHOP.city} — {SHOP.district}
              </p>
              <p>
                <a
                  className="hover:text-poppy"
                  href={`tel:${SHOP.phoneHref}`}
                >
                  {SHOP.phoneDisplay}
                </a>
              </p>
              <p>
                <a
                  className="hover:text-poppy"
                  href={`mailto:${SHOP.email}`}
                >
                  {SHOP.email}
                </a>
              </p>
            </address>
            {SHOP.streetAddress === null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                L&apos;adresse précise de l&apos;atelier vous est communiquée à
                la prise de commande.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">
              <PetalMark className="text-leaf" />
              Horaires
            </h2>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">
                Horaires d&apos;ouverture de la boutique
              </caption>
              <tbody>
                {SHOP.hours.map((day) => (
                  <tr
                    key={day.label}
                    className="border-b border-border/70 last:border-0"
                  >
                    <th
                      scope="row"
                      className="py-1.5 text-left font-normal capitalize"
                    >
                      {day.label}
                    </th>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {day.opens && day.closes
                        ? `${day.opens.replace(":", " h ")} — ${day.closes.replace(":", " h ")}`
                        : "fermé"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">
              <PetalMark className="text-leaf" />
              Livraison
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>Retrait en boutique — gratuit</li>
              <li>Paris et proche couronne — 8 €, offert dès 80 €</li>
              <li>Départementale — 15 €</li>
              <li>Express le jour même — 25 €</li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
