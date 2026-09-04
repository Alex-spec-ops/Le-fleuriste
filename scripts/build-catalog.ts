/**
 * Assemble les lots de data/catalog/*.ts, les valide avec le schéma Zod,
 * puis écrit data/flowers.json. Échoue bruyamment à la première erreur.
 *
 *   npm run catalog:build
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { rawCatalog } from "../data/catalog";
import { CATEGORIES } from "../lib/constants";
import { flowerCatalogSchema } from "../lib/schemas/flower";

const result = flowerCatalogSchema.safeParse(rawCatalog);

if (!result.success) {
  console.error("Catalogue invalide :");
  for (const issue of result.error.issues.slice(0, 40)) {
    console.error(`  [${issue.path.join(".")}] ${issue.message}`);
  }
  console.error(`${result.error.issues.length} erreur(s).`);
  process.exit(1);
}

const flowers = result.data;
const byCategory = new Map<string, number>();
for (const flower of flowers) {
  byCategory.set(flower.category, (byCategory.get(flower.category) ?? 0) + 1);
}

let underfilled = 0;
for (const category of CATEGORIES) {
  if ((byCategory.get(category) ?? 0) < 15) underfilled += 1;
}

const target = resolve(process.cwd(), "data/flowers.json");
writeFileSync(target, `${JSON.stringify(flowers, null, 1)}${"\n"}`, "utf8");

console.log(`Catalogue écrit : ${flowers.length} fleurs -> data/flowers.json`);
for (const category of CATEGORIES) {
  const count = byCategory.get(category) ?? 0;
  const flag = count < 15 ? "  ! minimum 15" : "";
  console.log(`  ${String(count).padStart(3)}  ${category}${flag}`);
}
if (underfilled > 0) {
  console.warn(`${underfilled} catégorie(s) sous le seuil de 15 entrées.`);
}
