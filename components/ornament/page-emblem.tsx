import { FlowerShapes } from "@/components/flower-svg/flower-svg";
import { buildFlowerArt } from "@/lib/flower-art";
import { getFlowerById } from "@/lib/flowers";
import { emblemFor } from "@/lib/page-emblem";

/**
 * Filigrane de page : la fleur emblème, dessinée très pâle derrière le titre.
 * Purement décoratif — la fleur elle-même reste consultable au catalogue.
 */
export function PageEmblem({
  route,
  className,
}: {
  route: string;
  className?: string;
}) {
  const id = emblemFor(route);
  const flower = id ? getFlowerById(id) : undefined;
  if (!flower) return null;

  const art = buildFlowerArt(flower, false);

  return (
    <svg
      viewBox="0 0 100 92"
      className={`pointer-events-none absolute -z-10 select-none opacity-[0.07] ${className ?? "right-[-2rem] top-[-3rem] w-64 sm:right-4 sm:w-80"}`}
      aria-hidden
      focusable="false"
    >
      <FlowerShapes shapes={art.shapes} />
    </svg>
  );
}
