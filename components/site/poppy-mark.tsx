/**
 * Le coquelicot : marque de la maison.
 *
 * Cinq pétales en ellipses pivotées autour d'un cœur sombre à pastille de
 * pollen — la forme retenue dans la maquette. Purement décoratif : le nom de
 * la boutique porte l'information, la fleur ne fait que l'accompagner.
 */
export function PoppyMark({
  size = 38,
  className,
  petal = "var(--poppy-light)",
  heart = "var(--foreground)",
  pollen = "var(--pollen)",
}: {
  size?: number;
  className?: string;
  petal?: string;
  heart?: string;
  pollen?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      <g fill={petal}>
        <ellipse cx="50" cy="28" rx="17" ry="24" />
        <ellipse cx="26" cy="52" rx="17" ry="24" transform="rotate(-72 26 52)" />
        <ellipse cx="74" cy="52" rx="17" ry="24" transform="rotate(72 74 52)" />
        <ellipse cx="34" cy="80" rx="16" ry="22" transform="rotate(-144 34 80)" />
        <ellipse cx="66" cy="80" rx="16" ry="22" transform="rotate(144 66 80)" />
      </g>
      <circle cx="50" cy="56" r="12" fill={heart} />
      <circle cx="50" cy="56" r="5" fill={pollen} />
    </svg>
  );
}
