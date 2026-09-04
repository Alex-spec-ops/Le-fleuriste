import type { ReactNode } from "react";

import { BotanicalRule, CornerSprig, PetalMark } from "@/components/ornament/botanical";
import { PageEmblem } from "@/components/ornament/page-emblem";

/**
 * En-tête de page : sur-titre marqué d'un pétale, titre serif, chapeau,
 * puis un filet botanique qui ouvre le contenu.
 * La fleur emblème de la page est posée en filigrane derrière le titre.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  route,
  children,
  rule = true,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  /** Chemin de la page, pour choisir la fleur emblème. */
  route?: string;
  children?: ReactNode;
  rule?: boolean;
}) {
  return (
    <div className="botanical overflow-hidden">
      <CornerSprig corner="top-right" seed={`entete-${title}`} size={168} className="opacity-[0.13]" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
        {route ? <PageEmblem route={route} /> : null}

        {eyebrow ? (
          <p className="eyebrow">
            <PetalMark />
            {eyebrow}
          </p>
        ) : null}

        <h1 className="heading-display mt-3 text-4xl sm:text-5xl">{title}</h1>

        {lead ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {lead}
          </p>
        ) : null}

        {children ? <div className="mt-7">{children}</div> : null}

        {rule ? <BotanicalRule className="mt-10 max-w-2xl" /> : null}
      </div>
    </div>
  );
}

/**
 * Titre de section interne, avec la même ponctuation florale que les pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`}>
      <div>
        {eyebrow ? (
          <p className="eyebrow">
            <PetalMark />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="heading-display mt-2 text-2xl sm:text-3xl">{title}</h2>
        {lead ? <p className="mt-2 max-w-xl text-muted-foreground">{lead}</p> : null}
      </div>
      {actions}
    </div>
  );
}
