import Link from "next/link";

import { SHOP, formatOpeningSummary, formatPostalAddress } from "@/lib/shop";

const COLUMNS = [
  {
    title: "Nos outils",
    links: [
      { href: "/composer", label: "Composer un bouquet" },
      { href: "/devis", label: "Devis événementiel" },
      { href: "/catalogue", label: "Le catalogue des fleurs" },
      { href: "/boutique", label: "Bouquets prêts à commander" },
    ],
  },
  {
    title: "La maison",
    links: [
      { href: "/a-propos", label: "L'atelier et l'approvisionnement" },
      { href: "/evenements", label: "Mariages et événements" },
      { href: "/contact", label: "Nous écrire" },
    ],
  },
] as const;

export function SiteFooter() {
  const address = formatPostalAddress();

  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl">{SHOP.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{SHOP.tagline}</p>
          <address className="mt-5 space-y-1 text-sm not-italic text-foreground/80">
            <p>{address}</p>
            <p>
              <a className="hover:text-terracotta-strong" href={`tel:${SHOP.phoneHref}`}>
                {SHOP.phoneDisplay}
              </a>
            </p>
            <p>
              <a className="hover:text-terracotta-strong" href={`mailto:${SHOP.email}`}>
                {SHOP.email}
              </a>
            </p>
          </address>
          <p className="mt-4 text-sm text-muted-foreground">{formatOpeningSummary()}</p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="text-foreground/80 hover:text-terracotta-strong" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} {SHOP.name}. Fleurs coupées, compositions et décors floraux.
          </p>
          <p>
            Les prix affichés en ligne sont estimatifs et varient selon les arrivages du marché aux
            fleurs.
          </p>
        </div>
      </div>
    </footer>
  );
}
