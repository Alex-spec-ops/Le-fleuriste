import { chrysanthemes } from "./chrysanthemes";
import { dahlias } from "./dahlias";
import { gerberas } from "./gerberas";
import { hortensias } from "./hortensias";
import { lys } from "./lys";
import { oeillets } from "./oeillets";
import { orchidees } from "./orchidees";
import { pivoines } from "./pivoines";
import { renoncules } from "./renoncules";
import { roses } from "./roses";
import { tulipes } from "./tulipes";

/**
 * Catalogue brut, avant validation Zod.
 * Chaque lot est un module autonome de data/catalog/ ; en ajouter un revient
 * à créer le fichier, l'importer ici, puis relancer `npm run catalog:build`.
 */
export const rawCatalog = [
  ...roses,
  ...pivoines,
  ...tulipes,
  ...renoncules,
  ...orchidees,
  ...lys,
  ...dahlias,
  ...chrysanthemes,
  ...oeillets,
  ...gerberas,
  ...hortensias,
];
