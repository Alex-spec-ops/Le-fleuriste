import type { Style } from "@/lib/constants";

/**
 * Modèles de départ du composeur. Ils ne sont qu'un point d'entrée :
 * le client ajuste ensuite tige par tige.
 * Les identifiants sont vérifiés contre le catalogue par les tests.
 */
export type BouquetTemplate = {
  id: string;
  label: string;
  description: string;
  style: Style;
  items: Record<string, number>;
};

export const BOUQUET_TEMPLATES: BouquetTemplate[] = [
  {
    id: "champetre",
    label: "Champêtre",
    description: "Cueilli au jardin : des têtes irrégulières, de la verdure, rien de trop droit.",
    style: "champêtre",
    items: {
      "rose-peach-avalanche": 5,
      "renoncule-butterfly-charlotte": 4,
      "chrysantheme-country": 5,
      "oeillet-lege-marimo": 3,
      "dahlia-linda-s-baby": 3,
    },
  },
  {
    id: "romantique",
    label: "Romantique",
    description: "Roses parfumées et pivoines, dans un dégradé de roses poudrés et de rouge.",
    style: "romantique",
    items: {
      "rose-red-naomi": 6,
      "pivoine-sarah-bernhardt": 3,
      "rose-sweet-avalanche": 5,
      "oeillet-solomio-dora": 3,
      "chrysantheme-kermit": 3,
    },
  },
  {
    id: "blanc-vert",
    label: "Blanc & vert",
    description: "La composition la plus sûre : elle convient à un mariage comme à un hommage.",
    style: "minimaliste",
    items: {
      "rose-avalanche": 6,
      "chrysantheme-shamrock": 3,
      "oeillet-prado-mint": 4,
      "hortensia-magical-jade": 1,
      "chrysantheme-bacardi": 4,
    },
  },
  {
    id: "automnal",
    label: "Automnal",
    description: "Cuivre, caramel et bordeaux : la palette de septembre à novembre.",
    style: "luxuriant",
    items: {
      "dahlia-cafe-au-lait": 3,
      "dahlia-karma-choc": 4,
      "chrysantheme-anastasia-bronze": 3,
      "rose-toffee": 4,
      "hortensia-antique-green": 1,
    },
  },
  {
    id: "minimaliste",
    label: "Minimaliste",
    description: "Une seule variété, en nombre, et deux touches de vert. Rien d'autre.",
    style: "minimaliste",
    items: {
      "tulipe-white-triumphator": 9,
      "chrysantheme-shamrock": 2,
    },
  },
];
