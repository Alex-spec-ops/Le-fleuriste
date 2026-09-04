import type { ReactNode } from "react";

/** En-tête de page : sur-titre, titre serif, chapeau et actions éventuelles. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
      {eyebrow ? (
        <p className="text-[0.72rem] uppercase tracking-[0.22em] text-terracotta-strong">
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
    </div>
  );
}
