import type { BouquetSize, Occasion, Style, Wrapping } from "@/lib/constants";

/**
 * La sélection du fleuriste : des bouquets déjà composés, prêts à commander.
 * Ce sont de vraies compositions du catalogue ; leur prix est recalculé par
 * lib/pricing.ts, donc il ne peut pas diverger de celui du composeur.
 */
export type ShopBouquet = {
  id: string;
  name: string;
  pitch: string;
  occasions: Occasion[];
  style: Style;
  size: BouquetSize;
  wrapping: Wrapping;
  items: Record<string, number>;
};

export const SHOP_BOUQUETS: ShopBouquet[] = [
  {
    id: "bouquet-du-samedi",
    name: "Le bouquet du samedi",
    pitch: "Celui qu'on emporte sans raison particulière, juste pour la table du week-end.",
    occasions: ["invitation-dîner", "remerciement", "anniversaire"],
    style: "champêtre",
    size: "moyen",
    wrapping: "kraft simple",
    items: {
      "rose-peach-avalanche": 5,
      "chrysantheme-country": 5,
      "oeillet-lege-marimo": 3,
      "chrysantheme-madiba-rose": 4,
    },
  },
  {
    id: "premier-rendez-vous",
    name: "Premier rendez-vous",
    pitch:
      "Ni rouge ni démonstratif : des renoncules et des roses pâles, parfumées, dans un format modeste et soigné.",
    occasions: ["romantique"],
    style: "romantique",
    size: "petit",
    wrapping: "papier de soie",
    items: {
      "renoncule-cloni-rosa": 5,
      "rose-sweet-avalanche": 4,
      "oeillet-solomio-dora": 3,
      "chrysantheme-kermit": 2,
    },
  },
  {
    id: "un-grand-merci",
    name: "Un grand merci",
    pitch: "Des jaunes chauds et francs, sans ambiguïté romantique. Le bouquet de la gratitude.",
    occasions: ["remerciement", "félicitations", "réconfort"],
    style: "champêtre",
    size: "moyen",
    wrapping: "kraft simple",
    items: {
      "rose-ilios": 6,
      "chrysantheme-doria": 3,
      "oeillet-turbo-jaune": 4,
      "chrysantheme-country": 3,
    },
  },
  {
    id: "blanc-hommage",
    name: "Blanc d'hommage",
    pitch:
      "Blanc, ivoire et vert. Une composition sobre, sans pollen tachant, pour accompagner un deuil.",
    occasions: ["condoléances"],
    style: "minimaliste",
    size: "grand",
    wrapping: "kraft simple",
    items: {
      "rose-akito": 8,
      "chrysantheme-zembla-blanc": 4,
      "lys-roselily-natalia": 2,
      "chrysantheme-bacardi": 4,
    },
  },
  {
    id: "le-grand-rouge",
    name: "Le grand rouge",
    pitch: "Douze Red Naomi parfumées et trois pompons verts. Rien d'autre, et c'est bien assez.",
    occasions: ["romantique", "Saint-Valentin", "anniversaire"],
    style: "romantique",
    size: "moyen",
    wrapping: "papier de soie",
    items: { "rose-red-naomi": 12, "chrysantheme-kermit": 3 },
  },
  {
    id: "automne-a-l-atelier",
    name: "Automne à l'atelier",
    pitch: "Cuivre, caramel et bordeaux, avec une tête d'hortensia antique qui sèchera sur place.",
    occasions: ["anniversaire", "entreprise", "remerciement"],
    style: "luxuriant",
    size: "moyen",
    wrapping: "kraft simple",
    items: {
      "dahlia-karma-choc": 4,
      "rose-toffee": 4,
      "chrysantheme-anastasia-bronze": 3,
      "hortensia-antique-green": 1,
    },
  },
  {
    id: "pour-une-naissance",
    name: "Pour une naissance",
    pitch:
      "Pastel et léger, sans pollen fort. Nous vérifions avec vous s'il y a un animal à la maison.",
    occasions: ["naissance", "félicitations"],
    style: "pastel",
    size: "petit",
    wrapping: "vase inclus",
    items: {
      "renoncule-butterfly-ariadne": 4,
      "oeillet-prado-mint": 3,
      "gerbera-kimsey": 3,
      "rose-revival": 4,
    },
  },
  {
    id: "table-d-entreprise",
    name: "Table d'entreprise",
    pitch:
      "Deux à trois semaines de tenue, tons neutres, entretien minimal. Livrable en abonnement.",
    occasions: ["entreprise"],
    style: "moderne",
    size: "grand",
    wrapping: "vase inclus",
    items: {
      "chrysantheme-shamrock": 4,
      "oeillet-moonaqua": 6,
      "orchidee-dendrobium-bom-jo": 3,
      "chrysantheme-feeling-green": 3,
    },
  },
];
