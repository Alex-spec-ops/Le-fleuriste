# Logique tarifaire du catalogue

Tous les prix de `data/flowers.json` sont des **prix de détail TTC**, exprimés
à l'unité de vente de la fleur (`tige`, `botte`, `branche` ou `pot`). Ils
correspondent aux fourchettes pratiquées par un fleuriste artisanal parisien,
marges comprises, hors promotion.

## Fourchettes par catégorie

| Catégorie | Fourchette | Repères |
| --- | --- | --- |
| Roses | 2,60 – 9,20 € | standard 2,60–3,20 · premium 3,40–4,60 · roses de jardin anglaises 8,20–9,20 |
| Pivoines | 6,10 – 11,00 € | pleine saison 6,10–9,00 · itoh et variétés rares jusqu'à 11,00 |
| Tulipes | 2,00 – 3,90 € | simples 2,00–2,40 · triomphe et lys 2,20–2,90 · doubles, perroquets, frangées 2,60–3,90 |
| Renoncules | 3,00 – 5,80 € | séries courantes 3,00–3,80 · Cloni et Clooney 4,40–5,60 · Butterfly 5,40–5,80 |
| Orchidées | 5,20 – 17,00 € | Dendrobium et Mokara 5,20–6,80 · Oncidium et Paphiopedilum 7,50–9,00 · Phalaenopsis 11,50–13,00 · Cymbidium et Vanda 13,00–17,00 |
| Lys & Lilium | 4,60 – 9,60 € | asiatiques 4,60–5,40 · espèces 6,60–7,90 · orientaux 6,90–8,20 · OT et Roselily 8,00–9,60 |
| Dahlias | 3,40 – 7,50 € | boules et pompons 3,40–4,20 · décoratifs 4,20–5,80 · formes assiette 6,20–7,50 |
| Chrysanthèmes | 2,50 – 4,60 € | santini et sprays 2,50–3,20 la branche · grandes fleurs 3,20–4,60 la tige |
| Œillets | 1,90 – 3,40 € | standards 1,90–2,60 · sprays 2,40–3,00 · Chabaud parfumés 3,40 · Green Trick 3,20 |
| Gerberas | 2,00 – 3,00 € | germini 2,00–2,10 · gerberas standards 2,50–3,00 |
| Hortensias | 7,00 – 9,20 € | têtes moyennes 7,00–8,00 · grosses têtes et teintes antiques 8,20–9,20 |

## Ce qui fait varier un prix à l'intérieur d'une catégorie

1. **Le calibre de la fleur.** Une Red Naomi à 4,50 € porte deux fois plus de
   pétales qu'une Freedom à 3,00 €, sur une tige plus haute.
2. **La durée de culture.** Les roses de jardin anglaises demandent une
   conduite plus lente et se cassent au transport : d'où l'écart de prix avec
   une rose de serre.
3. **La tenue en vase.** Un chrysanthème à 3,40 € tient trois semaines ; un
   dahlia à 6,50 € tient cinq jours. Le prix à la tige ne dit pas tout, et les
   fiches affichent les deux informations.
4. **La rareté du coloris.** Toffee, Kahala, La Belle Époque ou Buckeye Belle
   sont plus chères que la même forme dans un coloris courant.
5. **La provenance.** Les fleurs importées coûtent plus cher hors saison — voir
   ci-dessous.

## Saisonnalité et majoration hors saison

Le champ `season` donne la disponibilité **réelle en France**. Aucune pivoine
n'est marquée « toute l'année » ; les roses de serre le sont, parce qu'elles le
sont effectivement.

Le champ `offSeasonImport` indique qu'une filière d'import existe hors saison
(serres néerlandaises, Kenya, Équateur, Chili, Nouvelle-Zélande). Le moteur de
prix applique alors un coefficient, défini dans `lib/pricing.ts` :

| Situation | Coefficient |
| --- | --- |
| En saison, ou disponible toute l'année | 1,00 |
| Import hors saison, cas général | 1,45 |
| Orchidées | 1,40 |
| Renoncules | 1,60 |
| Hortensias | 1,65 |
| Dahlias | 1,75 |
| Pivoines | 1,80 |

Une fleur hors saison **sans** filière d'import (les dahlias en janvier, les
tulipes en août) reste chiffrée au coefficient de sa catégorie, mais la ligne
est explicitement signalée « indisponible à cette date » dans le simulateur
comme dans le devis. Le site ne promet jamais une disponibilité.

## TVA — écart assumé au cahier des charges

Le § 6 du cahier des charges décrivait une ligne « TVA 20 % » ajoutée au total.
Comme le catalogue donne des prix **déjà TTC** (§ 2.1), les additionner puis
leur ajouter 20 % taxerait deux fois la même somme.

Le moteur travaille donc entièrement en TTC et affiche la TVA **comprise dans**
le total : `TVA = total × 20 / 120`, présentée sous l'intitulé « dont TVA 20 % ».
C'est la présentation habituelle d'un ticket de fleuriste, et c'est la seule
qui donne un total juste.

## Où modifier ces règles

- Prix d'une fleur : le lot correspondant dans `data/catalog/`, puis
  `npm run catalog:build`.
- Coefficients de saison, de style, main-d'œuvre, emballages, livraison :
  `lib/pricing.ts`. Les tests de `tests/pricing.test.ts` vérifient que le
  simulateur et le devis restent d'accord après toute modification.
