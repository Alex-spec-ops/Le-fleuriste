import type { Color, Occasion } from "@/lib/constants";

/**
 * Les registres du comptoir.
 *
 * Un fleuriste ne répond pas à « un bouquet pour un premier rendez-vous »
 * comme à « un bouquet pour des condoléances ». Ce fichier encode ces
 * différences de registre — ton, palette, enveloppe, ce qu'il faut éviter —
 * pour que le conseiller local et le prompt du modèle disent la même chose.
 */

export type Register = {
  id: string;
  /** Occasion du catalogue sur laquelle s'appuie la recherche de fleurs. */
  occasion: Occasion;
  /** Mots-clés normalisés (minuscules, sans accents) reconnus dans la demande. */
  keywords: readonly string[];
  /** Ce que le fleuriste comprend de la situation. */
  reading: string;
  /** Pourquoi ce choix convient à cette situation précise. */
  advice: string;
  /** Fourchette de prix habituelle pour cette occasion. */
  budget: readonly [number, number];
  palette?: readonly Color[];
  fragrantOnly?: boolean;
  /** Écarte d'office les gros pollens (nourrissons, chambres, hôpitaux). */
  excludeAllergens?: boolean;
  /** Fleurs à ne pas proposer dans ce registre, et pourquoi. */
  avoid?: { ids: readonly string[]; because: string };
  /** Noms donnés aux options proposées. */
  optionNames: readonly [string, string, string];
  /** Question posée seulement si le client n'a pas déjà parlé de ses animaux. */
  askAnimals?: string;
  /** Ton sobre : aucune formule enjouée, aucune familiarité. */
  sober?: boolean;
};

/**
 * L'ordre compte : les registres les plus spécifiques sont testés d'abord,
 * pour qu'« anniversaire de mariage » ne soit pas lu comme « anniversaire »,
 * ni « premier rendez-vous » comme un banal « romantique ».
 */
export const REGISTERS: readonly Register[] = [
  {
    id: "condoleances",
    occasion: "condoléances",
    keywords: [
      "condoleance",
      "deuil",
      "obseque",
      "enterrement",
      "funerail",
      "deces",
      "disparition",
      "perdu quelqu",
      "perdu son",
      "cimetiere",
      "veillee",
    ],
    reading: "Vous accompagnez un deuil.",
    advice:
      "Blanc, ivoire et vert, des formes sobres, rien de criard. Nous évitons le pollen tachant, qui pose toujours problème dans ce contexte.",
    budget: [55, 110],
    palette: ["blanc", "ivoire", "vert"],
    excludeAllergens: true,
    optionNames: [
      "Hommage sobre",
      "Hommage en blanc",
      "Grande composition d'hommage",
    ],
    sober: true,
  },
  {
    id: "premier-rendez-vous",
    occasion: "romantique",
    keywords: [
      "premier rendez",
      "premier rdv",
      "premiere rencontre",
      "premier date",
      "je la connais peu",
      "on se connait peu",
      "premier diner en amoureux",
    ],
    reading:
      "Un premier rendez-vous : l'intention doit être claire sans être appuyée.",
    advice:
      "Nous écartons volontairement la rose rouge, trop attendue et trop affirmative à ce stade. Un bouquet modeste, soigné et parfumé dit beaucoup plus.",
    budget: [25, 40],
    palette: ["rose pâle", "crème", "pêche", "blanc"],
    fragrantOnly: true,
    avoid: {
      ids: [
        "rose-red-naomi",
        "rose-grand-prix",
        "rose-freedom",
        "rose-rhodos",
        "rose-black-baccara",
        "rose-black-magic",
        "rose-darcey",
      ],
      because: "la rose rouge, trop appuyée pour une première rencontre",
    },
    optionNames: ["La juste mesure", "Un cran au-dessus", "Le beau geste"],
  },
  {
    id: "anniversaire-de-mariage",
    occasion: "romantique",
    keywords: [
      "anniversaire de mariage",
      "noces",
      "ans de mariage",
      "notre anniversaire de couple",
      "anniversaire de rencontre",
    ],
    reading:
      "Un anniversaire de mariage : le registre est celui de la durée et de la constance.",
    advice:
      "Roses de jardin et fleurs à parfum, qui évoquent le temps plutôt que l'élan. C'est une occasion où l'on peut monter en gamme sans que cela paraisse ostentatoire.",
    budget: [55, 110],
    fragrantOnly: true,
    optionNames: [
      "Les années comptées",
      "Un cran au-dessus",
      "La grande table",
    ],
  },
  {
    id: "invitation-diner",
    occasion: "invitation-dîner",
    keywords: [
      "invite a diner",
      "invitation a diner",
      "invite chez",
      "diner chez",
      "repas chez",
      "on m'invite",
      "je suis invite",
      "hote",
      "maitresse de maison",
      "pendaison de cremaillere",
      "cremaillere",
    ],
    reading: "Vous êtes reçu à dîner.",
    advice:
      "Surtout pas un bouquet qui oblige votre hôte à chercher un vase en plein service. Nous proposons une composition déjà liée ou livrée en vase, dans des tons gais et non romantiques.",
    budget: [20, 35],
    palette: ["blanc", "vert", "jaune", "pêche"],
    optionNames: ["Prêt à poser", "Le bouquet d'hôte", "Plus généreux"],
  },
  {
    id: "naissance",
    occasion: "naissance",
    keywords: [
      "naissance",
      "bebe",
      "nouveau-ne",
      "maternite",
      "accouch",
      "bapteme",
      "vient de naitre",
      "jeune maman",
    ],
    reading: "Une naissance.",
    advice:
      "Pastel et léger, et surtout sans pollen fort : la chambre d'un nourrisson n'est pas un endroit pour un lys ouvert.",
    budget: [30, 55],
    palette: ["rose pâle", "blanc", "crème", "pêche"],
    excludeAllergens: true,
    askAnimals:
      "Dites-moi s'il y a un animal à la maison : j'écarterai aussi les variétés toxiques.",
    optionNames: ["Tout en douceur", "Un cran au-dessus", "La belle arrivée"],
  },
  {
    id: "excuses",
    occasion: "excuses",
    keywords: [
      "excuse",
      "pardon",
      "me faire pardonner",
      "je me suis excuse",
      "reparer",
      "j'ai fait une betise",
      "brouille",
    ],
    reading: "Vous cherchez à vous faire pardonner.",
    advice:
      "La sincérité vaut mieux que la grandeur. Un bouquet démesuré donne l'impression d'acheter la paix ; une composition juste, bien finie, se lit tout autrement.",
    budget: [30, 50],
    optionNames: [
      "Simplement désolé",
      "La composition soignée",
      "Un mot plus appuyé",
    ],
  },
  {
    id: "entreprise",
    occasion: "entreprise",
    keywords: [
      "entreprise",
      "bureau",
      "societe",
      "seminaire",
      "professionnel",
      "accueil",
      "reception",
      "hall",
      "salle de reunion",
      "boutique",
      "abonnement",
      "client",
    ],
    reading: "Un décor professionnel.",
    advice:
      "Compositions structurées, tons neutres, et surtout une tenue longue : personne n'ira changer l'eau tous les deux jours. Nous travaillons volontiers en abonnement hebdomadaire.",
    budget: [45, 95],
    palette: ["blanc", "vert", "crème"],
    optionNames: [
      "Tenue longue",
      "Accueil structuré",
      "Grande composition d'accueil",
    ],
  },
  {
    id: "reconfort",
    occasion: "réconfort",
    keywords: [
      "reconfort",
      "malade",
      "hopital",
      "convalescence",
      "remonter le moral",
      "coup dur",
      "deprime",
      "triste",
      "operation",
      "guerison",
    ],
    reading:
      "Vous voulez faire du bien à quelqu'un qui traverse un moment difficile.",
    advice:
      "Des couleurs franches et gaies, une tenue longue pour que le bouquet dure au-delà de la visite, et pas de parfum entêtant si la personne est alitée.",
    budget: [30, 55],
    palette: ["jaune", "orange", "blanc", "pêche"],
    excludeAllergens: true,
    optionNames: ["Un peu de lumière", "Le bouquet qui dure", "Grand geste"],
  },
  {
    id: "fete-des-meres",
    occasion: "fête des mères",
    keywords: ["fete des meres", "maman", "ma mere", "belle-mere"],
    reading: "Pour votre mère.",
    advice:
      "Des fleurs qu'on regarde longtemps : une dominante généreuse, un parfum reconnaissable, et une palette qui ne se démode pas.",
    budget: [35, 70],
    fragrantOnly: true,
    optionNames: [
      "Le bouquet de fête",
      "Parfumé et généreux",
      "La grande brassée",
    ],
  },
  {
    id: "remerciement",
    occasion: "remerciement",
    keywords: [
      "merci",
      "remercier",
      "remerciement",
      "gratitude",
      "reconnaissance",
      "rendu service",
    ],
    reading: "Vous remerciez quelqu'un.",
    advice:
      "Des tons chauds et francs, sans ambiguïté romantique : le message doit rester celui de la gratitude, pas d'autre chose.",
    budget: [28, 50],
    palette: ["jaune", "pêche", "orange", "crème"],
    optionNames: ["Un vrai merci", "Chaleureux", "Grand merci"],
  },
  {
    id: "felicitations",
    occasion: "félicitations",
    keywords: [
      "felicit",
      "reussite",
      "promotion",
      "diplome",
      "examen",
      "nouveau poste",
      "concours",
      "victoire",
    ],
    reading: "Vous félicitez quelqu'un.",
    advice:
      "De la lumière et de la tenue : un bouquet qui se voit en arrivant et qui tient toute la semaine sur un bureau.",
    budget: [35, 65],
    palette: ["jaune", "orange", "blanc"],
    optionNames: ["Bravo", "Le bouquet qui se voit", "Célébration"],
  },
  {
    id: "saint-valentin",
    occasion: "Saint-Valentin",
    keywords: ["saint valentin", "saint-valentin", "14 fevrier"],
    reading: "La Saint-Valentin.",
    advice:
      "Si vous voulez le rouge, autant le prendre parfumé et de grande taille. Si vous préférez sortir du convenu, nous avons des alternatives plus personnelles.",
    budget: [45, 90],
    optionNames: ["Le classique", "Un cran au-dessus", "La grande déclaration"],
  },
  {
    id: "mariage",
    occasion: "mariage",
    keywords: [
      "mariage",
      "mariee",
      "se marie",
      "epouse",
      "ceremonie",
      "temoin",
    ],
    reading: "Un mariage.",
    advice:
      "Pour un décor complet, le devis en ligne est plus adapté qu'un simple bouquet : il chiffre pièce par pièce. Voici toutefois ce que nous montons le plus souvent en bouquet.",
    budget: [45, 95],
    palette: ["blanc", "crème", "rose pâle", "vert"],
    optionNames: ["Blanc et vert", "Romantique poudré", "Grande composition"],
  },
  {
    id: "romantique",
    occasion: "romantique",
    keywords: [
      "romantique",
      "amoureu",
      "ma copine",
      "mon copain",
      "ma compagne",
      "mon compagnon",
      "ma femme",
      "mon mari",
      "ma petite amie",
      "declaration",
      "je l'aime",
      "seduire",
      "conquerir",
    ],
    reading: "Une attention amoureuse.",
    advice:
      "Nous partons sur des fleurs à parfum et une palette chaude : c'est ce qui distingue un bouquet pensé d'un bouquet acheté à la va-vite.",
    budget: [35, 70],
    fragrantOnly: true,
    optionNames: ["Le bouquet pensé", "Parfumé", "La grande attention"],
  },
  {
    id: "anniversaire",
    occasion: "anniversaire",
    keywords: ["anniversaire", "ses ans", "fete son", "birthday"],
    reading: "Un anniversaire.",
    advice:
      "De la couleur et du volume. C'est l'occasion où l'on peut se permettre une palette plus vive que d'habitude.",
    budget: [30, 60],
    optionNames: ["Joyeux anniversaire", "Coloré", "La grande brassée"],
  },
];

/** Vocabulaire qui indique qu'on parle bien de fleurs, même sans occasion. */
export const FLORAL_VOCABULARY: readonly string[] = [
  "fleur",
  "bouquet",
  "compos",
  "rose",
  "pivoine",
  "tulipe",
  "renoncule",
  "orchidee",
  "lys",
  "dahlia",
  "chrysantheme",
  "oeillet",
  "gerbera",
  "hortensia",
  "feuillage",
  "verdure",
  "vase",
  "offrir",
  "cadeau",
  "livraison",
  "livrer",
  "budget",
  "saison",
  "parfum",
  "couleur",
  "bouton",
  "tige",
  "plante",
  "deco florale",
  "decoration florale",
];
