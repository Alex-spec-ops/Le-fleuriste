# LE Fleuriste — site vitrine et outils de vente

Site d'un artisan fleuriste parisien (Paris 10ᵉ), pensé pour transformer
l'hésitation en commande : un client qui ne connaît rien aux fleurs arrive,
se fait conseiller, compose, voit un prix, et repart avec un devis.

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
shadcn/ui (Base UI) · Zustand · Zod · Vitest.

## Démarrer

```bash
npm install
npm run dev
```

Le site tourne sur http://localhost:3000. **Aucune clé d'API n'est nécessaire
pour lancer le projet** : le conseiller floral bascule sur sa réponse de repli
tant que `MISTRAL_API_KEY` n'est pas renseignée. Tout le reste — catalogue,
composeur, simulateur, devis, PDF — fonctionne hors ligne.

Pour activer le conseiller :

```bash
cp .env.example .env.local
# puis renseignez MISTRAL_API_KEY
```

La clé s'obtient sur https://console.mistral.ai, rubrique « API Keys ». Elle
n'est lue que par `app/api/chat/route.ts`, côté serveur : elle n'apparaît
jamais dans le bundle envoyé au navigateur.

## Les commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sans émission |
| `npm run test` | suite Vitest (moteur de prix, catalogue, composeur, devis) |
| `npm run catalog:build` | valide les lots de fleurs et régénère `data/flowers.json` |

## Structure

```
app/
  page.tsx                  accueil
  catalogue/                catalogue filtrable + fiche par fleur
  composer/                 générateur de bouquet + simulateur de prix
  devis/                    devis événementiel en neuf étapes
  boutique/                 sélection de bouquets prêts à commander
  evenements/               vitrine mariages et événements
  a-propos/  contact/       pages de la maison
  illustrations/[file]/     SVG de chaque fleur, généré à la volée
  api/chat/                 conseiller Mistral (streaming + function calling)
  api/devis/  api/contact/  réception des demandes
components/
  catalogue/  composer/  devis/  boutique/  chat/  site/  flower-svg/  ui/
data/
  catalog/                  les lots de fleurs, sources du catalogue
  flowers.json              catalogue compilé et validé (généré)
  boutique.ts               la sélection du fleuriste
  avis.ts                   avis clients (vide par défaut, voir plus bas)
  CREDITS.md  PRICING.md    sources des visuels, logique tarifaire
lib/
  constants.ts              énumérations figées du domaine
  schemas/                  validation Zod (fleur, devis)
  flowers.ts                couche d'accès au catalogue
  pricing.ts                moteur de prix unique
  quote-builder.ts          composition automatique d'un devis
  quote-pdf.ts              génération du PDF
  flower-art.ts             illustrations SVG paramétriques
  bouquet-layout.ts         disposition des tiges dans le bouquet
  bouquet-harmony.ts        contrôle d'harmonie
  budget.ts                 curseur budget inversé et substitutions
  chat/                     prompt système, outils, client Mistral
  store/                    états partagés (bouquet, devis, conversation)
tests/                      Vitest
```

## Ajouter une fleur

1. Ouvrez le lot de sa catégorie dans `data/catalog/` (par exemple
   `roses.ts`), ou créez-en un nouveau sur le même modèle.
2. Ajoutez une entrée au tableau `seeds` :

```ts
{
  id: "rose-nouvelle-venue",          // slug unique, en minuscules
  fr: "Rose Nouvelle Venue",
  latin: "Rosa 'Nouvelle Venue'",     // nomenclature réelle, cultivar entre '…'
  colors: ["rose pâle", "crème"],     // palette normalisée de lib/constants.ts
  season: ["printemps", "été"],       // disponibilité réelle en France
  offSeason: true,                    // filière d'import hors saison ?
  price: 3.8,                         // € TTC à l'unité de vente
  vase: [7, 11],                      // tenue en vase, en jours
  height: [50, 70],                   // hauteur de tige, en cm
  fragrance: "légère",                // facultatif : défaut de la catégorie
  sym: ["tendresse", "attention"],
  occ: ["romantique", "remerciement"],
  desc: "Une ou deux phrases, ton fleuriste, sans remplissage marketing.",
}
```

3. Si vous créez un nouveau lot, importez-le dans `data/catalog/index.ts`.
4. Lancez `npm run catalog:build`. Le script valide chaque entrée avec le
   schéma Zod, refuse les doublons d'identifiant et de nom, vérifie la
   nomenclature botanique, puis réécrit `data/flowers.json`.
5. `npm run test` vérifie l'intégrité de l'ensemble.

L'illustration, la fiche produit, l'entrée du sitemap et l'index du conseiller
sont produits automatiquement : il n'y a rien d'autre à faire.

## Les quatre outils

**Le catalogue** (`/catalogue`) — filtrable par couleur, saison, catégorie,
prix, tenue en vase, absence d'allergène et innocuité pour les animaux. Chaque
fiche donne la symbolique, la saison réelle, la tenue, le prix et les
précautions.

**Le composeur** (`/composer`) — le bouquet se dessine à chaque ajout, en
couches (feuillage au fond, focales devant). La disposition est déterministe :
même bouquet et même graine donnent le même rendu, et « mélanger » ne change
que la graine. Export PNG, partage par lien (l'état est encodé dans l'URL),
sauvegarde automatique dans le navigateur.

**Le simulateur** — la barre de prix est toujours visible et se recalcule à
chaque geste. Le détail dépliable donne le prix ligne par ligne, la
main-d'œuvre, l'emballage, la majoration hors saison, la livraison et la TVA
comprise. Le curseur budget inversé propose des substitutions en expliquant
chaque arbitrage.

**Le devis événementiel** (`/devis`) — une question par écran. La date pilote
la saisonnalité, le nombre d'invités pré-dimensionne les centres de table, les
contraintes d'allergie et d'animaux sont des exclusions fermes. Sortie en
fourchette basse / recommandée / haute, PDF à en-tête, sauvegarde locale.

**Le conseiller** — accessible partout depuis le bouton flottant. Il comprend
la situation avant de proposer, pose deux ou trois questions, puis avance deux
ou trois options nommées avec leur prix. Il interroge le vrai catalogue par
function calling (`searchFlowers`, `getFlowerDetails`, `buildBouquetSuggestion`) :
une fleur qui n'existe pas ne peut pas être recommandée. Chaque proposition se
transforme en bouquet d'un clic.

## Cohérence des prix

Le simulateur, la sélection boutique et le devis événementiel appellent tous
`lib/pricing.ts`. Un même bouquet donne exactement le même montant partout, et
`tests/pricing.test.ts` le vérifie pour toutes les combinaisons de style et de
saison. La logique tarifaire est documentée dans `data/PRICING.md`.

## Réception des demandes

Aucun service d'e-mail externe n'est branché, conformément au choix de la
boutique. Une demande de devis ou un message de contact est validé par Zod,
puis :

- écrit dans `data/demandes/AAAA-MM.jsonl` ou `data/messages/AAAA-MM.jsonl`
  quand le système de fichiers est accessible en écriture ;
- systématiquement tracé dans les journaux du serveur ;
- doublé, côté client, d'un bouton « ouvrir dans ma messagerie » qui prépare
  l'e-mail, et du PDF téléchargeable pour le devis.

Sur un hébergement au système de fichiers en lecture seule, seuls les journaux
subsistent. Pour brancher un envoi réel plus tard, il suffit d'ajouter l'appel
au service choisi dans `app/api/devis/route.ts` et `app/api/contact/route.ts` :
la validation et le format des données sont déjà en place.

## Avis clients

`data/avis.ts` exporte un tableau `REVIEWS` **volontairement vide** : nous ne
publions pas de témoignages inventés. Tant qu'il est vide, la page d'accueil
affiche les engagements de la maison. Ajoutez-y les avis réellement reçus, avec
l'accord de leurs auteurs, et la section bascule automatiquement.

## Direction artistique

Le vocabulaire botanique est un système, pas une collection de décorations
collées page par page : `components/ornament/botanical.tsx` construit chaque
forme par le calcul, comme les illustrations de fleurs. Une tige est une courbe
de Bézier, les feuilles sont posées le long de cette courbe en suivant sa
tangente, et une graine déterministe garantit qu'un brin donné est toujours
identique à lui-même.

| Élément | Rôle |
| --- | --- |
| `PetalMark` | ponctuation de la charte, devant chaque sur-titre |
| `BotanicalRule` | filet de séparation, deux brins et trois graines |
| `CornerSprig` | filigrane d'angle de section, effet papier à en-tête |
| `WreathArc` | arc de feuillage derrière le bouquet du hero |
| `PetalBorder` | frise de pétales entre deux grandes sections |
| `EmptySprig` | états vides : un brin seul dans un vase esquissé |
| `PageEmblem` | fleur emblème de la page, en filigrane derrière le titre |

Chaque page est placée sous une fleur du catalogue (`lib/page-emblem.ts`) :
la pivoine Sarah Bernhardt pour l'accueil, la renoncule Clooney Hanoï pour le
catalogue, la rose Avalanche pour le composeur, et ainsi de suite. Ce ne sont
pas des motifs interchangeables mais de vraies variétés de la boutique, et un
test vérifie qu'aucun emblème ne pointe vers une fleur inexistante.

Le fond porte un grain de papier en CSS pur (deux trames de points décalées et
une lueur chaude en haut de page), sans image ni requête supplémentaire. Au
survol, les cartes laissent apparaître un halo de pétale dans leur angle.

Tous ces éléments portent `aria-hidden` : ils n'existent pas pour un lecteur
d'écran, et `prefers-reduced-motion` neutralise leurs transitions.

## Accessibilité et performance

- Navigation clavier complète, lien d'évitement, libellés ARIA sur tous les
  contrôles, régions `aria-live` sur les compteurs et les prix.
- `prefers-reduced-motion` respecté : le compteur de prix, les apparitions au
  défilement et les transitions du bouquet se désactivent.
- Contrastes AA : le terracotta n'est jamais employé pour du texte courant, une
  variante assombrie (`--terracotta-strong`) lui est substituée.
- Aucune dépendance CDN externe : polices servies en local par `next/font`,
  illustrations générées par le code, aucune image distante.
- Le navigateur ne reçoit qu'une version allégée du catalogue (sans les
  descriptions ni la symbolique), assemblée par `getCatalogForClient()`.

## Écarts assumés au cahier des charges

Ils sont signalés là où ils comptent, et repris ici :

1. **TVA comprise plutôt qu'ajoutée.** Le catalogue est en TTC ; ajouter 20 %
   au total taxerait deux fois. Détail dans `data/PRICING.md`.
2. **Unité `pot` ajoutée.** La catégorie imposée « Plantes fleuries en pot »
   n'avait pas d'unité correspondante dans l'énumération.
3. **Champ `offSeasonImport` ajouté** au schéma de la fleur : le § 2.2 impose
   de marquer les fleurs importées hors saison pour les majorer, sans que le
   champ figure au § 2.1.
4. **Pas de photographies tierces.** Les illustrations SVG paramétriques
   assurent seules le visuel. Raisons dans `data/CREDITS.md`.
5. **Catalogue de 280 variétés sur 11 catégories**, au lieu des 500 sur 20
   demandées : le travail sur les données a été interrompu à la demande du
   commanditaire. Les neuf catégories restantes — dont « Feuillages & verdure »,
   « Branchages » et « Graminées » — sont déclarées dans `lib/constants.ts` et
   attendent leurs lots dans `data/catalog/`. Le composeur fonctionne sans
   elles (les chrysanthèmes santini et l'œillet Green Trick tiennent le rôle de
   remplissage), mais aucune fleur n'a aujourd'hui le rôle `feuillage`.
