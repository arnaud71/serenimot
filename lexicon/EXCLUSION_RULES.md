# Règles candidates d'exclusion

Analyse générée à partir de la comparaison locale avec ODS 8.

Commandes :

```bash
npm run lexicon:compare:ods8
npm run lexicon:analyze:ods8-exclusions
```

Rapports locaux ignorés par Git :

```text
lexicon/generated/ods8-compatibility-report.json
lexicon/generated/ods8-exclusion-candidates.json
lexicon/generated/ods8-exclusion-candidates.tsv
lexicon/generated/ods8-priority-review-report.json
lexicon/generated/ods8-priority-review.tsv
lexicon/generated/ods8-priority-suggested-exclusions.txt
```

## Constats actuels

Sérénimot contient actuellement 221347 mots.

Comparaison ODS 8 :

- 209728 mots communs ;
- 11619 mots présents dans Sérénimot mais absents d'ODS 8 ;
- 201702 formes présentes dans ODS 8 mais absentes de Sérénimot.

Parmi les 11619 mots Sérénimot hors ODS 8 :

- 10586 sont attestés dans Morphalou ;
- 1033 sont absents de Morphalou ;
- 8630 sont des formes dérivées ajoutées par le pipeline ;
- 1657 sont des noms ;
- 663 sont des verbes ou formes verbales ;
- 512 sont des adjectifs ;
- 264 ont 4 lettres ou moins ;
- 210 sont courts et peu fréquents ;
- 36 sont des onomatopées ou interjections ;
- 4 sont marqués comme abréviations probables.

Le rapport enrichi propose trois niveaux :

- `exclude` : 132 mots ;
- `review-high-priority` : 1019 mots ;
- `review` : 10468 mots.

Après application des 132 exclusions prudentes, il reste :

- 11487 mots Sérénimot hors ODS 8 ;
- 904 mots absents de Morphalou ;
- 115 mots courts et peu fréquents en revue prioritaire.

Après application de la politique stricte sur ces 115 mots courts, le dictionnaire contient 221100 mots.

## Règles candidates

### 1. Exclusions automatiques prudentes

Exclure seulement les mots classés `exclude`.

Effet : 132 exclusions.

Exemples : `AGRO`, `ALIM`, `BCBG`, `BEUARK`, `BIB`, `BLOB`, `DC`, `ETC`, `MLLE`, `PCHITT`, `TACATAC`, `ZZZZ`.

Intérêt : cette règle retire les cas les plus visibles et discutables : petits mots hors ODS 8, absents de Morphalou ou très suspects, abréviations probables, et certaines interjections hors référence.

Limite : cette règle est volontairement conservatrice. Elle ne nettoie pas tous les mots rares.

### 2. Revue prioritaire

Examiner les mots classés `review-high-priority`.

Effet : 1019 candidats.

Exemples : `ABC`, `ACHELEME`, `ADP`, `AERO`, `AJAX`, `ALBERTINE`, `ALLEMAGNE`, `ALLIUM`, `AMARO`, `ASTRO`, `AUVERGNE`.

Intérêt : cette catégorie contient beaucoup de mots absents de Morphalou, mots courts, noms propres probables, gentilés, variantes rares ou formes techniques.

Recommandation : ne pas les supprimer en bloc avant d'ajouter un filtre plus précis pour noms propres, gentilés, abréviations et mots techniques.

### 2.1 Mots courts prioritaires

Le rapport `ods8-priority-review-report.json` isole 115 mots courts et peu fréquents hors ODS 8.

Exemples : `ABC`, `ADP`, `AERO`, `AJAX`, `APE`, `DOWN`, `ERGO`, `HACK`, `IBEX`, `LSD`, `PC`, `PH`, `PTIT`, `RAN`, `TS`, `TT`.

Intérêt : les mots courts ont un effet très fort sur les possibilités de jeu. Même lorsqu'ils existent dans Morphalou, leur absence d'ODS 8 justifie une validation stricte.

Sortie de travail :

```text
lexicon/generated/ods8-priority-suggested-exclusions.txt
```

Statut : appliqué dans le build complet.

Commande :

```bash
npm run lexicon:build:full
```

### 2.2 Absents de Morphalou

904 mots prioritaires sont absents de Morphalou.

Exemples : `ACHELEME`, `ADJUPETE`, `ALLEMAGNE`, `ALLIUM`, `AUVERGNE`, `BANYAN`, `BARBARA`, `BITHYNIEN`, `BLEUBITE`.

Intérêt : cette famille contient probablement un mélange de noms propres, gentilés, termes techniques, variantes rares et mots valables mais spécialisés.

Recommandation : ne pas exclure automatiquement. Ajouter d'abord des règles plus fines pour noms propres probables, gentilés et domaines techniques.

### 3. Revue simple

Garder pour l'instant les mots classés `review`.

Effet : 10468 mots conservés.

Exemples : `ABATTANTE`, `ABIMANTES`, `ABOYANTE`, `ACCELERANTE`, `ACQUIESCEE`.

Intérêt : beaucoup sont attestés dans Morphalou, souvent comme formes dérivées françaises. Leur absence d'ODS 8 ne suffit pas à justifier une exclusion automatique dans Sérénimot.

### 4. Mode strict compatible ODS 8

Exclure tout mot Sérénimot absent de la référence ODS 8 locale.

Effet : 11619 exclusions.

Avantage : comportement plus proche du Scrabble.

Limite : dépend d'une comparaison locale avec une source ODS non redistribuée. Cette liste ne doit pas être copiée dans le dépôt ni dans le dictionnaire public sans validation juridique.

## Recommandation

Prochaine étape jouable recommandée :

1. conserver les 132 exclusions prudentes déjà générées ;
2. conserver les 115 exclusions courtes désormais appliquées ;
3. garder les 904 autres mots prioritaires pour des règles plus fines ;
4. ne pas supprimer les 10468 mots `review` sans autre preuve.

Cette approche améliore la qualité sans transformer Sérénimot en copie stricte d'ODS.

## Analyse active 4.00.1-preview des absents ODS 8

La commande suivante cartographie les mots ODS 8 absents du lexique actif, sans modifier le dictionnaire et sans distribuer ODS :

```bash
npm run lexicon:analyze:ods8-missing-active
npm run lexicon:summarize:ods8-missing-active
```

Constat actuel :

- 61 336 mots ODS 8 sont absents du lexique actif ;
- 42 068 dépassent 13 lettres et sont donc hors limite du plateau actuel ;
- 19 268 restent jouables ;
- 339 mots jouables sont signalés comme noms propres par Lefff et doivent rester exclus ;
- 188 petits mots doivent être revus séparément ;
- 11 441 mots jouables n'ont pas de confirmation Morphalou/Lefff.

Recommandation : traiter les formes générables depuis des lemmes déjà acceptés avant toute autre vague. Les mots sans confirmation ouverte doivent rester en revue tant qu'une source redistribuable plus précise n'est pas disponible.
