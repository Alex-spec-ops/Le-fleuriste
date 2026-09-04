"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHOP } from "@/lib/shop";

const NAV = [
  { href: "/catalogue", label: "Le catalogue" },
  { href: "/composer", label: "Composer" },
  { href: "/boutique", label: "Boutique" },
  { href: "/evenements", label: "Mariages & événements" },
  { href: "/devis", label: "Devis" },
  { href: "/a-propos", label: "L'atelier" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex flex-col leading-none"
          onClick={() => setOpen(false)}
          aria-label={`${SHOP.name}, accueil`}
        >
          <span className="font-heading text-2xl font-medium tracking-tight sm:text-[1.7rem]">
            {SHOP.name}
          </span>
          <span className="mt-0.5 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Paris 10ᵉ
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-1 text-[0.92rem] transition-colors hover:text-terracotta-strong",
                      active ? "text-terracotta-strong" : "text-foreground/80",
                    )}
                  >
                    {item.label}
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute -bottom-0.5 left-0 h-px w-full bg-terracotta-strong"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/composer" />}
            size="sm"
            className="hidden sm:inline-flex"
          >
            Composer un bouquet
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
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
        className="border-t border-border/70 bg-background lg:hidden"
      >
        <nav aria-label="Navigation principale, version mobile">
          <ul className="mx-auto flex w-full max-w-6xl flex-col px-5 py-2 sm:px-8">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block border-b border-border/50 py-3 text-[0.95rem]",
                      active ? "text-terracotta-strong" : "text-foreground/85",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
