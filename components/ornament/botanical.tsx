import { hashSeed, makeRandom } from "@/lib/flower-art";

/**
 * Vocabulaire botanique décoratif.
 *
 * Toutes les formes sont construites par le calcul, comme les illustrations
 * de fleurs : une tige est une courbe de Bézier, les feuilles sont posées le
 * long de cette courbe en suivant sa tangente. Rien n'est dessiné à la main,
 * donc rien ne « tombe à côté » quand on change une longueur ou une courbure.
 *
 * Ces éléments sont purement ornementaux : ils portent tous `aria-hidden` et
 * n'apparaissent jamais dans l'arbre d'accessibilité.
 */

/** Deux décimales : au-delà, le serveur et le client ne s'accordent plus. */
function r(value: number): number {
  return Math.round(value * 100) / 100;
}

type Point = { x: number; y: number };

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Angle de la tangente à la courbe, en degrés. */
function quadraticAngle(p0: Point, p1: Point, p2: Point, t: number): number {
  const u = 1 - t;
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

type SprigProps = {
  /** Graine : deux brins de graines différentes ne sont jamais identiques. */
  seed?: string;
  /** Nombre de paires de feuilles le long de la tige. */
  leafPairs?: number;
  /** Longueur des feuilles, en unités du repère. */
  leafLength?: number;
  /** Termine le brin par une petite fleur. */
  budded?: boolean;
  color?: string;
  className?: string;
};

/**
 * Un brin : une tige courbe, des feuilles alternées, éventuellement un bouton.
 * Dessiné dans un repère 0 0 120 120, la base en bas à gauche.
 */
export function Sprig({
  seed = "brin",
  leafPairs = 5,
  leafLength = 22,
  budded = true,
  color = "currentColor",
  className,
}: SprigProps) {
  const random = makeRandom(hashSeed(seed));

  const p0: Point = { x: 8, y: 114 };
  const p1: Point = { x: 30 + random() * 26, y: 58 };
  const p2: Point = { x: 96, y: 12 + random() * 12 };

  const stem = `M${r(p0.x)} ${r(p0.y)} Q${r(p1.x)} ${r(p1.y)} ${r(p2.x)} ${r(p2.y)}`;
  const leaves: { cx: number; cy: number; rx: number; ry: number; rotate: number }[] = [];

  for (let index = 0; index < leafPairs; index += 1) {
    const t = 0.16 + (index / Math.max(1, leafPairs - 1)) * 0.72;
    const point = quadraticPoint(p0, p1, p2, t);
    const angle = quadraticAngle(p0, p1, p2, t);
    // Les feuilles rapetissent vers la pointe, comme sur une vraie tige.
    const scale = 1 - t * 0.45;
    const length = leafLength * scale * (0.85 + random() * 0.3);
    const side = index % 2 === 0 ? 1 : -1;
    const spread = 38 + random() * 16;

    leaves.push({
      cx: r(point.x + Math.cos(((angle + side * spread) * Math.PI) / 180) * length * 0.5),
      cy: r(point.y + Math.sin(((angle + side * spread) * Math.PI) / 180) * length * 0.5),
      rx: r(length * 0.5),
      ry: r(length * 0.19),
      rotate: r(angle + side * spread),
    });
  }

  const tip = quadraticPoint(p0, p1, p2, 1);

  return (
    <g className={className} aria-hidden>
      <path
        d={stem}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {leaves.map((leaf, index) => (
        <ellipse
          key={index}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={color}
          opacity={0.55}
          transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
      {budded ? (
        <g>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx={r(tip.x + Math.cos((angle * Math.PI) / 180) * 4.4)}
              cy={r(tip.y + Math.sin((angle * Math.PI) / 180) * 4.4)}
              rx={4.6}
              ry={3.2}
              fill={color}
              opacity={0.5}
              transform={`rotate(${angle + 90} ${r(tip.x + Math.cos((angle * Math.PI) / 180) * 4.4)} ${r(tip.y + Math.sin((angle * Math.PI) / 180) * 4.4)})`}
            />
          ))}
          <circle cx={r(tip.x)} cy={r(tip.y)} r={2.6} fill={color} opacity={0.75} />
        </g>
      ) : null}
    </g>
  );
}

/**
 * Filigrane d'angle de section. Très pâle, il donne l'impression d'un papier
 * à en-tête plutôt que d'une bordure de composant.
 */
export function CornerSprig({
  corner = "top-left",
  seed = "angle",
  className,
  size = 132,
}: {
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  seed?: string;
  className?: string;
  size?: number;
}) {
  const position = {
    "top-left": "left-0 top-0",
    "top-right": "right-0 top-0 -scale-x-100",
    "bottom-left": "bottom-0 left-0 -scale-y-100",
    "bottom-right": "bottom-0 right-0 -scale-100",
  }[corner];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`pointer-events-none absolute ${position} text-sage opacity-[0.18] ${className ?? ""}`}
      aria-hidden
      focusable="false"
    >
      <g transform="rotate(180 60 60)">
        <Sprig seed={seed} leafPairs={5} />
      </g>
    </svg>
  );
}

/**
 * Séparateur : deux filets fins et un brin au centre.
 * Remplace les traits de séparation neutres entre les grandes sections.
 */
export function BotanicalRule({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-sage ${className ?? ""}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <svg viewBox="0 0 120 44" width="86" height="32" focusable="false">
        <g transform="translate(2 0) scale(0.34) translate(0 -8)">
          <Sprig seed="filet-gauche" leafPairs={4} leafLength={26} />
        </g>
        <g transform="translate(118 0) scale(-0.34 0.34) translate(0 -8)">
          <Sprig seed="filet-droit" leafPairs={4} leafLength={26} />
        </g>
        <circle cx="60" cy="22" r="3.2" fill="currentColor" opacity="0.55" />
        <circle cx="52" cy="22" r="1.6" fill="currentColor" opacity="0.35" />
        <circle cx="68" cy="22" r="1.6" fill="currentColor" opacity="0.35" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}

/**
 * Petite marque à trois pétales, posée devant les sur-titres.
 * C'est le signe de ponctuation de la charte.
 */
export function PetalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      className={`inline-block shrink-0 ${className ?? ""}`}
      aria-hidden
      focusable="false"
    >
      {[270, 30, 150].map((angle) => {
        const cx = r(12 + Math.cos((angle * Math.PI) / 180) * 5.4);
        const cy = r(12 + Math.sin((angle * Math.PI) / 180) * 5.4);
        return (
          <ellipse
            key={angle}
            cx={cx}
            cy={cy}
            rx={5.6}
            ry={3.6}
            fill="currentColor"
            opacity={0.85}
            transform={`rotate(${angle + 90} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Arc de feuillage, posé derrière le hero ou une image maîtresse.
 * Il rappelle l'arche florale, sans jamais concurrencer le contenu.
 */
export function WreathArc({ className }: { className?: string }) {
  const leaves: { x: number; y: number; angle: number; scale: number }[] = [];
  const random = makeRandom(hashSeed("arche"));

  for (let index = 0; index < 26; index += 1) {
    const t = index / 25;
    // Demi-cercle, de la gauche vers la droite en passant par le haut.
    const angle = Math.PI + t * Math.PI;
    const radius = 150 + (random() - 0.5) * 10;
    leaves.push({
      x: r(200 + Math.cos(angle) * radius),
      y: r(190 + Math.sin(angle) * radius * 0.92),
      angle: r((angle * 180) / Math.PI + 90 + (random() - 0.5) * 24),
      scale: r(0.75 + random() * 0.5),
    });
  }

  return (
    <svg
      viewBox="0 0 400 210"
      className={`pointer-events-none absolute inset-x-0 top-0 -z-10 w-full text-sage opacity-25 ${className ?? ""}`}
      aria-hidden
      focusable="false"
    >
      {leaves.map((leaf, index) => (
        <ellipse
          key={index}
          cx={leaf.x}
          cy={leaf.y}
          rx={r(13 * leaf.scale)}
          ry={r(4.6 * leaf.scale)}
          fill="currentColor"
          opacity={0.5}
          transform={`rotate(${leaf.angle} ${leaf.x} ${leaf.y})`}
        />
      ))}
    </svg>
  );
}

/**
 * Illustration des états vides : un brin seul, penché, dans un vase esquissé.
 * Elle dit « il n'y a rien ici » sans avoir l'air d'une erreur.
 */
export function EmptySprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 140"
      className={`mx-auto text-sage ${className ?? "h-28 w-28"}`}
      aria-hidden
      focusable="false"
    >
      <g transform="translate(14 6) scale(0.92)">
        <Sprig seed="etat-vide" leafPairs={4} leafLength={24} />
      </g>
      <path
        d="M52 108 L56 134 Q70 139 84 134 L88 108 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        opacity={0.45}
      />
      <path d="M52 108 L88 108" stroke="currentColor" strokeWidth={1.4} opacity={0.45} />
    </svg>
  );
}

/**
 * Bandeau de pétales tombants, utilisé en pied de page et en bas des grandes
 * sections claires. Une frise, pas un motif répété mécaniquement.
 */
export function PetalBorder({ className }: { className?: string }) {
  const random = makeRandom(hashSeed("frise"));
  const petals = Array.from({ length: 22 }, (_, index) => {
    const x = r(index * 40 + random() * 22);
    return {
      x,
      y: r(6 + random() * 12),
      rotate: r(random() * 360),
      scale: r(0.6 + random() * 0.7),
    };
  });

  return (
    <svg
      viewBox="0 0 880 32"
      preserveAspectRatio="none"
      className={`pointer-events-none block h-6 w-full text-sage opacity-30 ${className ?? ""}`}
      aria-hidden
      focusable="false"
    >
      {petals.map((petal, index) => (
        <ellipse
          key={index}
          cx={petal.x}
          cy={petal.y}
          rx={r(7 * petal.scale)}
          ry={r(3.4 * petal.scale)}
          fill="currentColor"
          transform={`rotate(${petal.rotate} ${petal.x} ${petal.y})`}
        />
      ))}
    </svg>
  );
}
