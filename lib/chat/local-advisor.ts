import { composeBouquet, type ComposedBouquet } from "@/lib/chat/compose";
import {
  FLORAL_VOCABULARY,
  REGISTERS,
  type Register,
} from "@/lib/chat/registers";
import { COLORS, seasonForDate, type Color } from "@/lib/constants";
import { getAllFlowers } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";
import type { Flower } from "@/lib/schemas/flower";
import { SHOP } from "@/lib/shop";

/**
 * Conseiller local.
 *
 * Il tient le comptoir quand l'API du modèle ne répond pas — clé absente,
 * quota fermé, panne réseau. Il ne devine pas : il lit la demande, identifie
 * le registre (§ « Les registres du comptoir »), puis compose de vraies
 * propositions chiffrées avec le catalogue de la boutique.
 *
 * Il ne sort jamais du sujet floral : hors de ce domaine, il le dit et ramène
 * la conversation aux fleurs.
 */

export type AdvisorSuggestion = {
  title: string;
  items: Record<string, number>;
};
export type AdvisorReply = { text: string; suggestions: AdvisorSuggestion[] };

export function normalise(value: string): string {
  return value.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findRegister(message: string): Register | null {
  for (const register of REGISTERS) {
    if (register.keywords.some((keyword) => message.includes(keyword)))
      return register;
  }
  return null;
}

/** Budget explicite : « 40 € », « environ 50 euros », « budget de 35 ». */
export function detectBudget(message: string): number | null {
  const patterns = [
    /(\d{2,4})\s*(?:€|eur\b|euros?)/,
    /budget\s*(?:de|:|d'environ|autour de)?\s*(\d{2,4})/,
    /(?:environ|autour de|max(?:imum)?|jusqu'a)\s*(\d{2,4})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(message);
    const value = match?.[1] ? Number(match[1]) : Number.NaN;
    if (Number.isFinite(value) && value >= 10 && value <= 3000) return value;
  }
  return null;
}

export function detectColors(message: string): Color[] {
  return COLORS.filter((color) => message.includes(normalise(color)));
}

type Constraints = { petSafe: boolean; excludeAllergens: boolean };

export function detectConstraints(message: string): Constraints {
  const pets = /\bchat\b|\bchats\b|\bchien|animau|animal|felin/.test(message);
  const allergy = /allergi|pollen|asthm|rhinite|sinus/.test(message);
  return { petSafe: pets, excludeAllergens: allergy };
}

function isFloral(message: string): boolean {
  return FLORAL_VOCABULARY.some((word) => message.includes(word));
}

/**
 * Vrai si la demande ne relève manifestement pas du domaine floral.
 * Utilisé pour couper court avant même d'appeler le modèle : le périmètre du
 * conseiller est verrouillé côté serveur, pas seulement par le prompt.
 */
export function isOffTopic(message: string): boolean {
  const text = normalise(message);
  if (text.trim().length === 0) return false;
  return findRegister(text) === null && !isFloral(text);
}

function describe(bouquet: ComposedBouquet): string {
  return bouquet.lines
    .map((line) => `${line.quantity} × ${line.flower.nameFr}`)
    .join(", ");
}

const OPENING_QUESTIONS = [
  "Pour qui est-ce, et à quelle occasion ?",
  "Quel budget approximatif avez-vous en tête ?",
  "Des préférences, ou des choses à éviter — allergies, animaux, fleurs que la personne n'aime pas ?",
];

/** Réponse hors sujet : on le dit, et on ramène aux fleurs. */
export function offTopicReply(): AdvisorReply {
  return {
    text: [
      "Je ne conseille que sur les fleurs et les compositions de la boutique : c'est le seul domaine où je peux vous répondre avec justesse.",
      "",
      "En revanche, si vous avez quelqu'un à qui offrir, dites-moi simplement pour qui et à quelle occasion, et je vous oriente.",
    ].join("\n"),
    suggestions: [],
  };
}

/** Fleurs du catalogue explicitement nommées dans la demande. */
function mentionedFlowers(text: string): Flower[] {
  return getAllFlowers().filter((flower) =>
    text.includes(normalise(flower.nameFr)),
  );
}

/**
 * Le client nomme des fleurs sans dire l'occasion — c'est le cas du bouton
 * « Demander l'avis du fleuriste » du composeur. On lui rend ce que la fiche
 * nous apprend de sa composition avant de lui demander le contexte.
 */
function critiqueReply(flowers: readonly Flower[]): AdvisorReply {
  const season = seasonForDate(new Date());
  const shortest = [...flowers].sort(
    (a, b) => a.vaseLifeDays[1] - b.vaseLifeDays[1],
  )[0];
  const toxic = flowers.filter((flower) => flower.toxicPets);
  const allergenic = flowers.filter(
    (flower) => flower.allergenRisk === "élevé",
  );
  const outOfSeason = flowers.filter(
    (flower) =>
      !flower.season.includes("toute l'année") &&
      !flower.season.includes(season),
  );

  const remarks: string[] = [];
  if (shortest) {
    remarks.push(
      `${shortest.nameFr} est la plus fragile de l'ensemble : ${shortest.vaseLifeDays[0]} à ${shortest.vaseLifeDays[1]} jours. C'est elle qui donnera le signal du renouvellement.`,
    );
  }
  if (outOfSeason.length > 0) {
    remarks.push(
      `${outOfSeason.map((flower) => flower.nameFr).join(", ")} ${outOfSeason.length > 1 ? "ne sont pas" : "n'est pas"} de saison en ${season} : ${outOfSeason.length > 1 ? "elles viendront" : "elle viendra"} d'import, avec la majoration correspondante.`,
    );
  }
  if (toxic.length > 0) {
    remarks.push(
      `${toxic.map((flower) => flower.nameFr).join(", ")} ${toxic.length > 1 ? "sont toxiques" : "est toxique"} pour les chats et les chiens : à signaler si le bouquet part dans un foyer avec animaux.`,
    );
  }
  if (allergenic.length > 0) {
    remarks.push(
      `Pollen important sur ${allergenic.map((flower) => flower.nameFr).join(", ")} : à éviter pour une personne sensible.`,
    );
  }

  return {
    text: [
      "Voici ce que je peux vous dire de cette composition :",
      "",
      ...remarks.map((remark) => `— ${remark}`),
      "",
      "Pour aller plus loin, dites-moi pour qui elle est et à quelle occasion : c'est ce qui décide du reste.",
    ].join("\n"),
    suggestions: [],
  };
}

function greetingReply(): AdvisorReply {
  return {
    text: [
      "Bonjour, et bienvenue à l'atelier.",
      "",
      "Pour vous orienter utilement, trois choses me suffisent :",
      ...OPENING_QUESTIONS.map((question) => `— ${question}`),
    ].join("\n"),
    suggestions: [],
  };
}

/**
 * Compose deux à trois options distinctes pour un registre donné.
 * Chaque option écarte les fleurs déjà retenues par la précédente, pour que
 * le client ait un vrai choix et non trois fois le même bouquet.
 */
function buildOptions(
  register: Register,
  budget: number,
  palette: readonly Color[],
  constraints: Constraints,
): { bouquet: ComposedBouquet; title: string }[] {
  const targets = [budget * 0.85, budget, budget * 1.3];
  const used = new Set<string>(register.avoid?.ids ?? []);
  const options: { bouquet: ComposedBouquet; title: string }[] = [];

  for (const [index, target] of targets.entries()) {
    const bouquet = composeBouquet({
      occasion: register.occasion,
      budget: Math.round(target),
      palette: palette.length > 0 ? palette : register.palette,
      petSafe: constraints.petSafe,
      excludeAllergens:
        constraints.excludeAllergens || register.excludeAllergens,
      fragrantOnly: register.fragrantOnly && index < 2,
      variant: index,
      exclude: [...used],
    });
    if (!bouquet) continue;

    for (const line of bouquet.lines) used.add(line.flower.id);
    options.push({ bouquet, title: "" });
    if (options.length === 3) break;
  }

  // Les noms d'options vont du plus sobre au plus généreux : on les attribue
  // après coup, une fois les compositions classées par prix.
  return options
    .sort((a, b) => a.bouquet.total - b.bouquet.total)
    .map((option, index) => ({
      ...option,
      title: register.optionNames[index] ?? `Option ${index + 1}`,
    }));
}

export function adviseLocally(message: string): AdvisorReply {
  const text = normalise(message);

  if (text.trim().length === 0) return greetingReply();

  const register = findRegister(text);

  if (!register) {
    // Pas d'occasion reconnue : si l'on parle bien de fleurs, on pose les
    // questions du comptoir ; sinon, on recadre poliment.
    if (!isFloral(text)) return offTopicReply();
    const named = mentionedFlowers(text);
    return named.length > 0 ? critiqueReply(named) : greetingReply();
  }

  const constraints = detectConstraints(text);
  const palette = detectColors(text);
  const budget =
    detectBudget(text) ??
    Math.round((register.budget[0] + register.budget[1]) / 2);

  const options = buildOptions(register, budget, palette, constraints);

  if (options.length === 0) {
    return {
      text: [
        register.reading,
        "",
        `Je n'ai rien en boutique qui corresponde exactement à ces critères pour la saison en cours. Appelez-nous au ${SHOP.phoneDisplay}, nous trouverons une solution ensemble.`,
      ].join("\n"),
      suggestions: [],
    };
  }

  const lines: string[] = [register.reading, "", register.advice];

  // `register.advice` explique déjà l'éviction quand il y en a une : la
  // répéter ici donnerait deux fois la même phrase au client.
  if (constraints.petSafe) {
    lines.push(
      "",
      "Vous avez mentionné un animal : je n'ai retenu que des variétés sans danger pour les chats et les chiens.",
    );
  } else if (register.askAnimals) {
    lines.push("", register.askAnimals);
  }
  if (constraints.excludeAllergens) {
    lines.push("", "J'ai écarté les fleurs à pollen important.");
  }

  lines.push("", "Voici ce que je vous proposerais :");

  for (const [index, option] of options.entries()) {
    lines.push(
      "",
      `${index + 1}. ${option.title} — ${formatEuro(option.bouquet.total)}`,
      `   ${describe(option.bouquet)}.`,
    );
  }

  lines.push(
    "",
    register.sober
      ? "Les prix dépendent des arrivages du marché ; la disponibilité est à confirmer avec la boutique."
      : "Les prix varient selon les arrivages du marché aux fleurs — la disponibilité est à confirmer avec nous. Vous pouvez ouvrir l'une de ces compositions dans le composeur pour l'ajuster.",
  );

  return {
    text: lines.join("\n"),
    suggestions: options.map((option) => ({
      title: option.title,
      items: option.bouquet.items,
    })),
  };
}
