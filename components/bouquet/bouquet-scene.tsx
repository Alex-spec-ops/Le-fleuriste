import { WrapBack, WrapFront } from "@/components/bouquet/wrapping";
import { FlowerShapes } from "@/components/flower-svg/flower-svg";
import {
  CANVAS,
  layoutFoliage,
  stemPath,
  type BouquetLayout,
  type FoliageSprig,
  type PlacedStem,
} from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";
import { buildFlowerArt, hashSeed, type Shape } from "@/lib/flower-art";

/**
 * Contenu du bouquet, partagé par le composeur et les aperçus figés.
 *
 * Les deux rendaient la même chose en double, et divergeaient à la moindre
 * retouche. Ils passent maintenant par ici, dans cet ordre de couches :
 *
 *   vase → verdure → tiges → emballage → ombres portées → têtes
 *
 * La verdure passe derrière les fleurs et déborde du cercle qu'elles
 * dessinent : c'est elle qui donne au bouquet un pourtour irrégulier plutôt
 * qu'un disque. Les ombres portées, elles, séparent les têtes qui se
 * chevauchent — sans elles, les corolles se confondent en un aplat.
 */

/** Sens de la lumière, commun à l'emballage et aux fleurs : en haut à gauche. */
const SHADOW_OFFSET = { x: 3, y: 6 } as const;

/**
 * Modelé d'une corolle : une lueur du côté de la lumière, une ombre de
 * l'autre. Sans elles, une fleur reste une rosace plate, quel que soit le
 * soin mis dans ses pétales.
 *
 * Les deux taches sont découpées à la silhouette de la fleur, sinon elles
 * baveraient sur les corolles voisines et sur le fond.
 */
function HeadModelling({ accent }: { accent: string }) {
  // Une fleur blanche n'a presque pas de haute lumière : elle est déjà au
  // maximum. Poser dessus la même tache claire que sur une rose rouge la
  // délave et efface ses pétales. On module donc les deux taches par la
  // clarté de la fleur : lumière franche sur les teintes soutenues, ombre
  // plus marquée sur les pâles.
  const light = luminance(accent);
  return (
    <>
      <ellipse
        cx={41}
        cy={37}
        rx={19}
        ry={16}
        fill="#FFFFFF"
        opacity={round2(0.05 + (1 - light) * 0.24)}
      />
      <ellipse
        cx={60}
        cy={56}
        rx={22}
        ry={19}
        fill="#3A2415"
        opacity={round2(0.09 + light * 0.11)}
      />
    </>
  );
}

/** Clarté perçue d'une couleur hexadécimale, de 0 (noir) à 1 (blanc). */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Tout ce qu'une variété a besoin de fournir, calculé une fois par bouquet.
 *
 * Le dessin d'une fleur est déterministe : le recalculer pour chacune des
 * cent soixante tiges reviendrait à faire trois fois le même travail.
 */
type VarietyArt = {
  shapes: Shape[];
  /** Formes pleines seules : un trait ne découpe rien et n'ombre rien. */
  silhouette: Shape[];
  /** La même silhouette en sombre, pour l'ombre portée. */
  shadow: Shape[];
  accent: string;
};

function varietyArtOf(flower: PlacedStem["flower"]): VarietyArt {
  const art = buildFlowerArt(flower, false, "compact");
  const silhouette = art.shapes.filter((shape) => shape.kind !== "stroke");
  return {
    shapes: art.shapes,
    silhouette,
    shadow: silhouette.map((shape) => ({ ...shape, fill: "#2A1D12", opacity: undefined })),
    accent: art.accent,
  };
}

/**
 * Identifiant de masque propre à la scène : plusieurs bouquets cohabitent sur
 * la page boutique, et deux `id` identiques dans un même document sont une
 * erreur, même quand leur contenu l'est aussi.
 */
function sceneId(layout: BouquetLayout, seed: number): string {
  const varieties = layout.stems.map((stem) => stem.flower.id).join("|");
  return `bq${hashSeed(`${varieties}-${seed}`).toString(36)}`;
}

/** Feuille en amande, base à l'origine et pointe vers la droite. */
function leafPath(length: number): string {
  const half = round2(length * 0.44);
  const belly = round2(length * 0.42);
  const tip = round2(length);
  return `M0 0 Q${belly} ${-half} ${tip} 0 Q${belly} ${half} 0 0 Z`;
}

function Foliage({ sprigs }: { sprigs: readonly FoliageSprig[] }) {
  return (
    <g aria-hidden>
      {sprigs.map((sprig) => (
        <g key={sprig.key} opacity={sprig.opacity}>
          <path
            d={sprig.d}
            fill="none"
            stroke={sprig.tone}
            strokeWidth={sprig.width}
            strokeLinecap="round"
          />
          {sprig.leaves.map((leaf, index) => (
            // Amande pointue plutôt qu'ellipse : alignées le long d'une tige,
            // des ellipses se lisent comme des perles enfilées.
            <path
              key={index}
              d={leafPath(leaf.length)}
              fill={sprig.tone}
              transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/** Transformation d'une tête : position, inclinaison, taille, écrasement. */
function headTransform(stem: PlacedStem): string {
  const scaleX = (stem.scale * stem.squeezeX).toFixed(3);
  const scaleY = (stem.scale * stem.squeezeY).toFixed(3);
  return [
    `translate(${stem.x.toFixed(1)} ${stem.y.toFixed(1)})`,
    `rotate(${stem.rotate.toFixed(1)})`,
    `scale(${scaleX} ${scaleY})`,
    "translate(-50 -46)",
  ].join(" ");
}

export function BouquetScene({
  layout,
  seed,
  wrapping,
  animated = false,
}: {
  layout: BouquetLayout;
  seed: number;
  wrapping: Wrapping;
  /** Anime les déplacements de têtes, quand le bouquet est modifiable. */
  animated?: boolean;
}) {
  const empty = layout.stems.length === 0;
  const foliage = layoutFoliage(layout.stems.length, seed);
  const transition = animated
    ? { transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" }
    : undefined;

  // Un masque par variété, pas un par tige : le bouquet compte jusqu'à cent
  // soixante tiges pour une poignée de variétés.
  const prefix = sceneId(layout, seed);
  const byVariety = new Map<string, VarietyArt>();
  for (const stem of layout.stems) {
    if (!byVariety.has(stem.flower.id)) byVariety.set(stem.flower.id, varietyArtOf(stem.flower));
  }

  return (
    <>
      <defs>
        {[...byVariety].map(([id, variety]) => (
          <clipPath key={id} id={`${prefix}-${id}`} clipPathUnits="userSpaceOnUse">
            <FlowerShapes shapes={variety.silhouette} />
          </clipPath>
        ))}
      </defs>

      <WrapBack wrapping={wrapping} />

      <Foliage sprigs={foliage} />

      <g aria-hidden>
        {layout.stems.map((stem) => (
          <path
            key={`tige-${stem.key}`}
            d={stemPath(stem)}
            fill="none"
            stroke={stem.stemTone}
            strokeWidth={stem.stemWidth}
            strokeLinecap="round"
            opacity={0.55 + stem.depth * 0.4}
          />
        ))}
      </g>

      {empty ? null : <WrapFront wrapping={wrapping} />}

      <g aria-hidden>
        {layout.stems.map((stem) => {
          const variety = byVariety.get(stem.flower.id);
          if (!variety) return null;
          return (
            <g key={stem.key} transform={headTransform(stem)} style={transition}>
              {/* Ombre portée : la silhouette de la fleur elle-même, un peu
                  élargie et décalée du côté opposé à la lumière. Une ellipse
                  faisait l'affaire pour une corolle sombre, mais laissait un
                  halo gris autour des fleurs blanches, qui n'ont pas de
                  contour propre. */}
              <g
                transform={`translate(${SHADOW_OFFSET.x} ${SHADOW_OFFSET.y}) translate(50 46) scale(1.06) translate(-50 -46)`}
                opacity={0.17}
              >
                <FlowerShapes shapes={variety.shadow} />
              </g>
              <g opacity={stem.opacity.toFixed(2)}>
                <FlowerShapes shapes={variety.shapes} />
                <g clipPath={`url(#${prefix}-${stem.flower.id})`}>
                  <HeadModelling accent={variety.accent} />
                </g>
              </g>
            </g>
          );
        })}
      </g>
    </>
  );
}

export { CANVAS };
