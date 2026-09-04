# Sources et licences des visuels

## Illustrations florales — production originale

**Tous les visuels de fleurs du site sont générés par le code de ce dépôt.**
Aucune photographie tierce n'est utilisée, et aucune image n'est téléchargée
depuis un service externe.

- **Module** : `lib/flower-art.ts`
- **Rendu React** : `components/flower-svg/flower-svg.tsx`
- **Route SVG** : `app/illustrations/[file]/route.ts` — sert
  `/illustrations/<identifiant>.svg`, l'adresse déclarée dans le champ
  `imageUrl` de chaque fleur.

Chaque illustration est un SVG paramétrique : une forme de base par famille
florale (corolle, marguerite, coupe, trompette, ombelle, épi, pompon,
feuillage), colorisée depuis `colors[0]` et légèrement variée par une graine
déterministe tirée de l'identifiant de la fleur. Une même fleur donne donc
toujours exactement le même dessin, et deux cultivars de la même famille ne
sont jamais superposables.

**Licence** : ces illustrations font partie du code source du projet et
suivent sa licence. Elles sont libres de droits pour la boutique.

**Conséquence pratique** : il n'existe aucune image cassée possible. Une fleur
sans illustration ne peut pas exister, puisque le dessin est calculé à la
volée à partir de la fiche.

## Écart assumé au cahier des charges

Le § 2.3 proposait de compléter les illustrations par des photographies libres
de droits (Unsplash, Pexels) pour les fiches produit. Ce complément **n'a pas
été mis en place**, pour une raison simple : associer une photographie à un
cultivar précis (une rose Kahala plutôt qu'une rose Sahara) demande une
vérification humaine, photo par photo, que rien ne permet d'automatiser de
façon fiable. Publier une photo de rose générique sous le nom d'un cultivar
identifié serait une information fausse sur une fiche produit qui, par
ailleurs, engage la boutique sur un prix.

Les illustrations paramétriques remplissent donc seules ce rôle. Elles sont
cohérentes entre elles, se superposent proprement dans le composeur, et ne
promettent jamais un rendu photographique qui ne correspondrait pas à
l'arrivage du jour.

## Ajouter des photographies plus tard

Si la boutique souhaite ses propres photographies :

1. Déposez les fichiers dans `public/photos/<identifiant-de-la-fleur>.jpg`.
2. Remplacez la valeur de `imageUrl` dans le lot correspondant de
   `data/catalog/`, puis relancez `npm run catalog:build`.
3. Servez-les via `next/image` avec un `blurDataURL`.
4. Documentez ici la source, l'auteur et la licence de chaque photographie.

| Fichier | Source | Auteur | Licence | Vérifiée le |
| ------- | ------ | ------ | ------- | ----------- |
| _(aucune photographie pour l'instant)_ | | | | |

## Typographies

| Police | Usage | Source | Licence |
| ------ | ----- | ------ | ------- |
| Cormorant Garamond | Titres | Google Fonts, servie en local par `next/font` | SIL Open Font License 1.1 |
| Karla | Texte courant | Google Fonts, servie en local par `next/font` | SIL Open Font License 1.1 |

`next/font` télécharge les fichiers au moment du build et les sert depuis le
domaine du site : aucune requête vers Google n'est faite par le navigateur du
visiteur.

## Icônes

| Bibliothèque | Usage | Licence |
| ------------ | ----- | ------- |
| Lucide | Icônes d'interface | ISC |
