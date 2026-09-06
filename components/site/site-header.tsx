"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";

import { PoppyMark } from "@/components/site/poppy-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHOP } from "@/lib/shop";

const NAV = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/composer", label: "Composer" },
  { href: "/boutique", label: "Bouquets" },
  { href: "/evenements", label: "Mariages & événements" },
  { href: "/a-propos", label: "L'atelier" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          onClick={() => setOpen(false)}
          aria-label={`${SHOP.name}, accueil`}
        >
          <PoppyMark size={36} />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[1.55rem] tracking-[-0.01em]">{SHOP.name}</span>
            <span className="mt-0.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-soft">
              Paris 10ᵉ
            </span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-1 text-[0.94rem] font-medium transition-colors hover:text-poppy",
                      active ? "text-poppy" : "text-foreground",
                    )}
                  >
                    {item.label}
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-poppy"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/catalogue" />}
            variant="ghost"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
            aria-label="Chercher une fleur au catalogue"
          >
            <Search aria-hidden />
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/composer" />}
            className="hidden rounded-full px-5 font-bold sm:inline-flex"
          >
            Composer un bouquet
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full xl:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-border bg-background xl:hidden"
      >
        <nav aria-label="Navigation principale, version mobile">
          <ul className="mx-auto flex w-full max-w-7xl flex-col px-5 py-2 sm:px-8">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block border-b border-border/70 py-3 text-[0.95rem] font-medium",
                      active ? "text-poppy" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="py-4">
              <Button
                nativeButton={false}
                render={<Link href="/composer" />}
                className="w-full rounded-full font-bold"
                onClick={() => setOpen(false)}
              >
                Composer un bouquet
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
