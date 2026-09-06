import { CANVAS } from "@/lib/bouquet-layout";
import type { Wrapping } from "@/lib/constants";

/**
 * Emballages du bouquet.
 *
 * Rendus en deux temps, parce qu'un emballage n'est pas un fond : le vase est
 * derrière les tiges — on les voit au travers du verre — tandis que le cornet
 * de papier et la boîte passent devant, et masquent la convergence des tiges
 * exactement comme le fait un vrai liage.
 *
 * Les formes sont écrites en dur : ce sont des objets, pas des fleurs, donc
 * elles n'ont aucune raison de varier d'un bouquet à l'autre.
 */

type PaperTones = {
  light: string;
  base: string;
  shade: string;
  deep: string;
};

const KRAFT: PaperTones = {
  light: "#E6D4B8",
  base: "#D8C2A0",
  shade: "#C3A985",
  deep: "#AE9273",
};

const TISSUE: PaperTones = {
  light: "#FFF6F4",
  base: "#F6E7E4",
  shade: "#E7D0CB",
  deep: "#D6B9B3",
};

/** Bord supérieur du cornet : du papier, donc jamais une ligne droite. */
const COLLAR = [
  { x: 96, y: 340 },
  { x: 152, y: 322 },
  { x: 210, y: 331 },
  { x: 268, y: 320 },
  { x: 324, y: 342 },
] as const;

/**
 * Le bas du cornet n'est pas une pointe : le papier se referme sur les tiges
 * en un petit fond arrondi. Une pointe franche donne un cornet de glace.
 */
const FOOT = { left: 196, right: 224, y: 454 } as const;

function footAt(fraction: number): { x: number; y: number } {
  return {
    x: FOOT.left + (FOOT.right - FOOT.left) * fraction,
    y: FOOT.y,
  };
}

/**
 * Cornet de papier : quatre pans depuis le col jusqu'au fond, alternés clair
 * et sombre. C'est cette alternance qui fait lire un pli plutôt qu'un aplat.
 */
function PaperCone({ tones }: { tones: PaperTones }) {
  const panels = [tones.shade, tones.base, tones.light, tones.base];
  const panelCount = COLLAR.length - 1;

  return (
    <g aria-hidden>
      {COLLAR.slice(0, -1).map((point, index) => {
        const next = COLLAR[index + 1];
        if (!next) return null;
        const footEnd = footAt((index + 1) / panelCount);
        const footStart = footAt(index / panelCount);
        return (
          <path
            key={`pan-${index}`}
            d={`M${point.x} ${point.y} L${next.x} ${next.y} L${footEnd.x} ${footEnd.y} L${footStart.x} ${footStart.y} Z`}
            fill={panels[index] ?? tones.base}
          />
        );
      })}

      {/* Fond arrondi : le papier plié se referme, il ne se termine pas en aiguille. */}
      <path
        d={`M${FOOT.left} ${FOOT.y - 6} Q210 ${FOOT.y + 12} ${FOOT.right} ${FOOT.y - 6} Z`}
        fill={tones.shade}
      />

      {/* Arêtes des plis : un trait fin, plus sombre, sur chaque pliure. */}
      {COLLAR.slice(1, -1).map((point, index) => (
        <path
          key={`pli-${index}`}
          d={`M${point.x} ${point.y} L${footAt((index + 1) / panelCount).x} ${FOOT.y}`}
          stroke={tones.deep}
          strokeWidth={0.9}
          fill="none"
          opacity={0.45}
        />
      ))}

      {/* Le col est retourné : une bande claire souligne l'épaisseur du papier. */}
      <path
        d={`M${COLLAR[0].x} ${COLLAR[0].y} Q152 ${COLLAR[1].y - 4} 210 ${COLLAR[2].y - 2} Q268 ${COLLAR[3].y - 4} ${COLLAR[4].x} ${COLLAR[4].y} L${COLLAR[4].x - 7} ${COLLAR[4].y + 12} Q268 ${COLLAR[3].y + 9} 210 ${COLLAR[2].y + 11} Q152 ${COLLAR[1].y + 9} ${COLLAR[0].x + 7} ${COLLAR[0].y + 12} Z`}
        fill={tones.light}
        opacity={0.9}
      />
    </g>
  );
}

/** Nœud de ruban : deux boucles, un cœur et deux pans coupés en V. */
function Ribbon() {
  const knotY = CANVAS.bindY - 14;

  return (
    <g aria-hidden>
      {/* Pans, dessinés en premier : ils passent sous les boucles. */}
      <path
        d={`M206 ${knotY + 6} L184 ${knotY + 56} L194 ${knotY + 49} L197 ${knotY + 60} L214 ${knotY + 9} Z`}
        fill="#A82A12"
      />
      <path
        d={`M214 ${knotY + 6} L238 ${knotY + 54} L228 ${knotY + 48} L224 ${knotY + 59} L206 ${knotY + 9} Z`}
        fill="#D93A1E"
      />

      <path
        d={`M210 ${knotY} C176 ${knotY - 17} 158 ${knotY + 2} 171 ${knotY + 16} C181 ${knotY + 27} 199 ${knotY + 12} 210 ${knotY} Z`}
        fill="#D93A1E"
      />
      <path
        d={`M210 ${knotY} C244 ${knotY - 17} 262 ${knotY + 2} 249 ${knotY + 16} C239 ${knotY + 27} 221 ${knotY + 12} 210 ${knotY} Z`}
        fill="#C13317"
      />

      <ellipse cx={210} cy={knotY + 3} rx={8} ry={6.5} fill="#A82A12" />
      <ellipse cx={208} cy={knotY + 1} rx={3.4} ry={2.4} fill="#E8583C" opacity={0.8} />
    </g>
  );
}

/**
 * Ce qui se place derrière les tiges : uniquement le corps du vase, pour que
 * l'on voie les tiges plonger dedans.
 */
export function WrapBack({ wrapping }: { wrapping: Wrapping }) {
  if (wrapping !== "vase inclus") return null;

  return (
    <g aria-hidden>
      {/* Panse galbée plutôt que trapèze : un vase n'a pas d'arêtes droites. */}
      <path
        d="M170 360 C162 396 160 434 168 458 Q210 472 252 458 C260 434 258 396 250 360 Z"
        fill="#D5E1E3"
      />
      {/* Eau : plus dense au fond, comme dans un verre rempli aux deux tiers. */}
      <path
        d="M166 400 C163 424 162 442 168 458 Q210 472 252 458 C258 442 257 424 254 400 Z"
        fill="#BCD4DA"
        opacity={0.85}
      />
    </g>
  );
}

/**
 * Ce qui se place devant les tiges : le cornet, la boîte, ou le verre du
 * vase avec ses reflets.
 */
export function WrapFront({ wrapping }: { wrapping: Wrapping }) {
  if (wrapping === "vase inclus") {
    return (
      <g aria-hidden>
        {/* Verre : une pellicule translucide, deux reflets, un col ourlé. */}
        <path
          d="M170 360 C162 396 160 434 168 458 Q210 472 252 458 C260 434 258 396 250 360 Z"
          fill="#FFFFFF"
          opacity={0.2}
        />
        <path
          d="M181 368 C175 398 174 430 180 452"
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />
        <path
          d="M241 372 C245 398 245 424 241 446"
          stroke="#FFFFFF"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />
        {/* Ligne d'eau, vue de face : une ellipse écrasée. */}
        <ellipse cx={210} cy={400} rx={44} ry={5} fill="#A9C6CE" opacity={0.5} />
        <ellipse cx={210} cy={360} rx={40} ry={7} fill="#C9D9DC" />
        <ellipse cx={210} cy={360} rx={40} ry={7} fill="none" stroke="#AEC4C8" strokeWidth={1.4} />
      </g>
    );
  }

  if (wrapping === "boîte chapeau") {
    return (
      <g aria-hidden>
        {/* Panse légèrement galbée : un carton rond n'a pas de flancs droits. */}
        <path
          d="M134 302 C133 350 136 412 142 452 Q210 470 278 452 C284 412 287 350 286 302 Z"
          fill={KRAFT.base}
        />
        {/* Flanc droit dans l'ombre : la lumière vient de la gauche, comme partout ailleurs. */}
        <path
          d="M236 304 C240 356 240 412 238 458 Q260 457 278 452 C284 412 287 350 286 302 Z"
          fill={KRAFT.shade}
          opacity={0.8}
        />
        <path
          d="M152 306 C148 356 150 414 156 454"
          stroke={KRAFT.light}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />

        {/* Ruban ceinturant la boîte : un fleuriste fait le tour du carton, il
            ne croise pas deux bandes comme sur un paquet cadeau. */}
        <path d="M137 352 Q210 368 285 352 L285 371 Q210 387 137 371 Z" fill="#C13317" />
        <path
          d="M137 352 Q210 368 285 352 L285 357 Q210 373 137 357 Z"
          fill="#E8583C"
          opacity={0.45}
        />
        <path d="M210 362 C192 353 180 360 186 369 C192 377 204 369 210 362 Z" fill="#D93A1E" />
        <path d="M210 362 C228 353 240 360 234 369 C228 377 216 369 210 362 Z" fill="#A82A12" />
        <ellipse cx={210} cy={364} rx={5.5} ry={4.5} fill="#8E2410" />

        {/* Rebord du couvercle, puis l'ouverture sombre où plongent les tiges.
            Sans cette ombre, les fleurs ont l'air posées sur la boîte, pas dedans. */}
        <ellipse cx={210} cy={302} rx={76} ry={16} fill={KRAFT.light} />
        <ellipse
          cx={210}
          cy={302}
          rx={76}
          ry={16}
          fill="none"
          stroke={KRAFT.deep}
          strokeWidth={1.2}
          opacity={0.5}
        />
        <ellipse cx={210} cy={301} rx={65} ry={12} fill="#4A3B2A" opacity={0.85} />
        <ellipse cx={210} cy={299} rx={58} ry={9} fill="#2F2418" opacity={0.55} />
      </g>
    );
  }

  const tones = wrapping === "papier de soie" ? TISSUE : KRAFT;
  return (
    <g aria-hidden>
      <PaperCone tones={tones} />
      <Ribbon />
    </g>
  );
}
