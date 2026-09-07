import Link from "next/link";

import { PoppyMark } from "@/components/site/poppy-mark";
import { SHOP, formatOpeningSummary, formatPostalAddress } from "@/lib/shop";

const COLUMNS = [
  {
    title: "Boutique",
    links: [
      { href: "/catalogue", label: "Le catalogue" },
      { href: "/boutique", label: "Bouquets prêts" },
      { href: "/evenements", label: "Mariages & événements" },
    ],
  },
  {
    title: "Outils",
    links: [
      { href: "/composer", label: "Composer" },
      { href: "/composer", label: "Simulateur de prix" },
      { href: "/devis", label: "Devis événement" },
    ],
  },
  {
    title: "La maison",
    links: [
      { href: "/a-propos", label: "L'atelier" },
      { href: "/contact", label: "Nous écrire" },
    ],
  },
] as const;

export function SiteFooter() {
  const address = formatPostalAddress();

  return (
    <footer className="mt-24 bg-[#241a12] text-[#fff7ec]">
      <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-16 sm:px-8">
        <div className="grid gap-12 border-b border-[#43342a] pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <PoppyMark size={34} heart="#241a12" />
              <span className="font-heading text-2xl">{SHOP.name}</span>
            </div>
            <p className="mt-4 max-w-[17rem] text-sm leading-relaxed text-[#a8968a]">
              Fleuriste artisan dans le {SHOP.district}. Arrivage quotidien du marché,
              composition à la demande, devis pour vos événements.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.13em] text-leaf-bright">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-[0.92rem]">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      className="text-[#d9ccc0] transition-colors hover:text-[#fff7ec]"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <address className="space-y-1.5 text-sm not-italic text-[#d9ccc0]">
            <p>{address}</p>
            <p>
              <a className="hover:text-[#fff7ec]" href={`tel:${SHOP.phoneHref}`}>
                {SHOP.phoneDisplay}
              </a>
            </p>
            <p>
              <a className="hover:text-[#fff7ec]" href={`mailto:${SHOP.email}`}>
                {SHOP.email}
              </a>
            </p>
          </address>
          <p className="text-sm text-[#a8968a] md:col-span-3">{formatOpeningSummary()}</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#43342a] pt-6 text-xs text-[#8a7767] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SHOP.name}. Fleurs coupées, compositions et décors
            floraux.
          </p>
          <p>
            Les prix affichés en ligne sont estimatifs et varient selon les arrivages du marché
            aux fleurs. Photographies et vidéos{" "}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-[#fff7ec]"
            >
              Pexels
            </a>
            , à titre d&apos;illustration : elles montrent l&apos;espèce et la couleur, pas le
            cultivar exact.
          </p>
        </div>
      </div>
    </footer>
  );
}
