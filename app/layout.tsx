import type { Metadata } from "next";
import { Instrument_Serif, Karla } from "next/font/google";

import { ChatWidget } from "@/components/chat/chat-widget";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { SHOP } from "@/lib/shop";

import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SHOP.siteUrl),
  title: {
    default: `${SHOP.name} — artisan fleuriste à Paris 10ᵉ`,
    template: `%s — ${SHOP.name}`,
  },
  description:
    "Bouquets composés à la main, mariages et événements, devis en ligne et conseil personnalisé. Artisan fleuriste dans le 10ᵉ arrondissement de Paris.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SHOP.name,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${instrumentSerif.variable} ${karla.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Aller au contenu principal
        </a>
        <AnnouncementBar />
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <ChatWidget />
        <Toaster position="bottom-center" />
        <LocalBusinessJsonLd />
      </body>
    </html>
  );
}
