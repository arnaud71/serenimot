# Sources du dictionnaire

## Version actuelle

Le lexique jouable affiché dans l'application est :

- Lexique Sérénimot 4.00.5.
- Licence : [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- Fichier public téléchargeable actif : `public/static/dictionary/lexique4005.txt`.
- Ancien fichier conservé : `public/static/dictionary/lexique383.txt`.

Pour limiter le poids du dépôt GitHub, les archives complètes de prévisualisation et de release du pipeline lexical ne sont pas suivies par Git. Les fichiers distribués avec l'application sont conservés dans `public/static/dictionary/`.

La politique spécifique aux mots courts est documentée dans `lexicon/SHORT_WORD_POLICY.md`. Sa version structurée, destinée aux futurs scripts de filtrage, est `lexicon/short-word-policy.json`.

Convention de version :

- `3.83` reprend la version de la source originale Lexique 3.83 ;
- le dernier nombre est propre à Sérénimot et doit être incrémenté à chaque nouvelle version du lexique jouable.

## Source principale actuelle

La version actuelle utilise une liste hybride générée depuis Lexique 4.00, avec conservation contrôlée d'apports de `3.83.1` et enrichissement par règles documentées.

Source :

- [Lexique 4.00](https://www.lexique.org/), Boris New et Christophe Pallier.
- [Documentation Lexique](https://www.lexique.org/).
- Licence annoncée par Lexique/OpenLexicon : Creative Commons Attribution-ShareAlike 4.0.

Note de version : la version active `4.00.5` utilise Lexique 4.00 comme socle, conserve des apports du lexique Sérénimot `3.83.1` pour éviter les régressions, ajoute les vagues GO5 et GO6 de formes verbales régulières, active `TIPA` après revue stricte des petits mots, puis active `DIAM` après revue manuelle GO B.

### Préparation Lexique 4.00

La migration vers Lexique 4.00 doit être précédée d'un rapport local :

```bash
npm run lexicon:compare:lexique400
```

Cette commande attend `lexicon/sources/Lexique400.tsv`, source brute locale ignorée par Git, et génère :

```text
lexicon/generated/lexique400-migration-report.json
lexicon/generated/lexique400-migration-report-removed-review.tsv
```

Ce rapport compare les formes qui resteraient jouables avec les règles Sérénimot actuelles :

- mots communs ;
- ajouts potentiels ;
- retraits potentiels ;
- répartition par longueur ;
- répartition par catégorie grammaticale ;
- exemples annotés.

Il ne modifie pas `public/static/dictionary/lexique383.txt`.

Dernière analyse locale :

- Lexique 3.83 accepté avec les règles Sérénimot : 111 295 mots ;
- Lexique 4.00 accepté avec les mêmes règles : 147 765 mots ;
- mots communs : 98 071 ;
- ajouts potentiels : 49 694 ;
- retraits potentiels : 13 224.

Diagnostic des retraits :

- 13 222 mots sont absents de la source Lexique 4.00 après normalisation ;
- 2 mots sont présents dans Lexique 4.00 mais rejetés par les règles actuelles car la forme n'est plus alphabétique simple ;
- 8 127 retraits ont encore leur lemme accepté dans Lexique 4.00 ;
- 5 091 retraits n'ont pas leur lemme retrouvé dans Lexique 4.00 ;
- les retraits concernent surtout les verbes, puis les noms et adjectifs.

Conclusion provisoire : ne pas remplacer directement Lexique 3.83 par Lexique 4.00. La migration devra plutôt construire une base hybride `4.00.x`, en ajoutant Lexique 4.00 puis en conservant les retraits utiles de `3.83.1` après revue.

### Candidat Lexique Sérénimot 4.00.1-preview

Un candidat local peut être construit sans activer le dictionnaire dans le jeu :

```bash
npm run lexicon:build:lexique400-candidate
npm run lexicon:compare:lexique400-candidate:ods8
npm run lexicon:analyze:lexique400-candidate:ods8-only
npm run lexicon:build:lexique400-candidate-suggested-exclusions
npm run lexicon:build:lexique400-candidate-filtered
npm run lexicon:compare:lexique400-candidate-filtered:ods8
npm run lexicon:review:lexique400-short-words
npm run lexicon:build:lexique400-short-word-suggested-exclusions
npm run lexicon:build:lexique400-candidate-filtered-short
npm run lexicon:compare:lexique400-candidate-filtered-short:ods8
npm run lexicon:review:lexique400-remaining-short-words
npm run lexicon:build:lexique400-preview
```

Fichiers générés :

```text
lexicon/generated/lexique400-candidate.txt
lexicon/generated/lexique400-candidate-report.json
lexicon/generated/lexique400-candidate-ods8-compatibility-report.json
lexicon/generated/lexique400-candidate-ods8-only-analysis.json
lexicon/generated/lexique400-candidate-ods8-only-analysis.tsv
lexicon/generated/lexique400-candidate-suggested-exclusions.txt
lexicon/generated/lexique400-candidate-suggested-exclusions-report.json
lexicon/generated/lexique400-candidate-filtered.txt
lexicon/generated/lexique400-candidate-filtered-report.json
lexicon/generated/lexique400-candidate-filtered-ods8-compatibility-report.json
lexicon/generated/lexique400-short-words-review.tsv
lexicon/generated/lexique400-short-words-review-report.json
lexicon/generated/lexique400-short-word-suggested-exclusions.txt
lexicon/generated/lexique400-short-word-suggested-exclusions.tsv
lexicon/generated/lexique400-short-word-suggested-exclusions-report.json
lexicon/generated/lexique400-candidate-filtered-short.txt
lexicon/generated/lexique400-candidate-filtered-short-report.json
lexicon/generated/lexique400-candidate-filtered-short-ods8-compatibility-report.json
lexicon/generated/lexique400-remaining-short-words-review.tsv
lexicon/generated/lexique400-remaining-short-words-review-report.json
lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.txt
lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.manifest.json
lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.notes.md
```

Dernier résultat local :

- candidat : 370 076 mots ;
- base Lexique 4.00 acceptée : 147 765 mots ;
- dictionnaire Sérénimot courant : 359 420 mots ;
- mots ajoutés depuis Lexique 4.00 : 10 656 ;
- mots conservés depuis le dictionnaire courant hors Lexique 4.00 : 222 311 ;
- retraits 3.83 conservés par la revue : 13 194 ;
- compatibilité avec la référence ODS 8 : 350 094 mots communs ;
- mots du candidat absents d'ODS 8 : 19 982 ;
- mots ODS 8 absents du candidat : 61 336 ;
- part du candidat acceptée par la référence ODS 8 : 94,60 % ;
- couverture de la référence ODS 8 par le candidat : 85,09 %.

Revue mots courts après le premier filtre :

- mots courts restants hors ODS 8 revus : 340 ;
- exclusions mots courts proposées : 127 ;
- répartition : 55 mots de 2 lettres, 62 mots de 3 lettres, 10 mots de 4 lettres ;
- principaux signaux : 88 mots sans voyelle probablement assimilables à des sigles ou abréviations, 62 mots à très faible fréquence absents de Lefff, 12 catégories numériques ou unités, 12 catégories non lexicales ;
- les onomatopées et interjections ne sont pas exclues automatiquement par cette vague.

Résultat du candidat filtré bis :

- candidat filtré précédent : 369 083 mots ;
- exclusions mots courts appliquées : 127 ;
- candidat filtré bis : 368 956 mots ;
- mots communs avec ODS 8 : 350 094, inchangé ;
- mots du candidat filtré bis absents d'ODS 8 : 18 862 ;
- mots ODS 8 absents du candidat filtré bis : 61 336, inchangé ;
- part du candidat filtré bis acceptée par la référence ODS 8 : 94,89 % ;
- couverture de la référence ODS 8 par le candidat filtré bis : 85,09 % ;
- mots courts hors ODS restants : 10 de 2 lettres, 40 de 3 lettres, 163 de 4 lettres.

Revue lisible des 213 mots courts restants :

- `review-rare-morphalou` : 100 mots ;
- `review-rare-cross-source` : 35 mots ;
- `review-keep-cross-source` : 30 mots ;
- `keep-existing-cross-sourced` : 23 mots ;
- `review-rare-inflected-form` : 13 mots ;
- `review-keep-common-morphalou` : 10 mots ;
- `review-foreign-or-borrowed` : 1 mot ;
- `review-expressive-word` : 1 mot.

La décision produit correspondante est formalisée dans `lexicon/SHORT_WORD_POLICY.md` : exclure les sigles, abréviations, symboles d'unités et formes non lexicales ; garder provisoirement les mots déjà croisés ou confirmés par plusieurs sources ouvertes ; revoir humainement les mots rares, formes verbales courtes, emprunts et interjections.

Ancienne étape remplacée `4.00.1-preview` :

- mots : 368 956 ;
- statut : étape remplacée par `4.00.2` ;
- SHA-256 : `06a67197d285f6bbf73fe730f062648d356fd93d6b56fff83b8b0ab38d968c72` ;
- fichier de mots : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.txt` ;
- manifeste : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.manifest.json` ;
- notes : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.notes.md`.

L'application n'affiche plus cette étape comme version active. Elle reste conservée comme étape de migration.

Version remplacée `4.00.2` :

- mots : 369 324 ;
- statut : version remplacée par `4.00.3` ;
- SHA-256 : `eae1ec09d39ca9033fd5de6361087592cd30f72279b92dae8c94e8934990b576` ;
- fichier de mots : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.txt` ;
- manifeste : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.manifest.json` ;
- notes : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.notes.md`.

L'application n'affiche plus cette version comme active. Elle reste conservée comme release précédente.

Version remplacée `4.00.3` :

- mots : 369 537 ;
- statut : version remplacée par `4.00.4` ;
- SHA-256 : `6c9b4eb869e5253803eddaed7f0c669508094060c9cbe26920047493c44c71e6` ;
- fichier de mots : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.txt` ;
- manifeste : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.manifest.json` ;
- notes : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.notes.md`.

L'application n'affiche plus cette version comme active.

Version remplacée `4.00.4` :

- mots : 369 538 ;
- statut : version remplacée par `4.00.5` ;
- SHA-256 : `8e52b3e9fc47032d95292c09f81d4502f94df3b9d1075920c493abd513861412` ;
- fichier de mots : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.txt` ;
- manifeste : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.manifest.json` ;
- notes : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.notes.md`.

L'application n'affiche plus cette version comme active.

Version activée `4.00.5` :

- mots : 369 539 ;
- statut : version active dans l'application ;
- changement principal : acceptation manuelle de `DIAM` après revue GO B ;
- SHA-256 : `e3113ad66fbb72095685ed03788f2bbd6ba19b800ffc03f1e5b4609729a57fe9` ;
- fichier de mots public : `public/static/dictionary/lexique4005.txt` ;
- manifeste public compact : `public/static/dictionary/releases/lexique4005.manifest.json` ;
- explications pré-calculées publiques : `public/static/dictionary/lexique4005.explanations-*.json` ;
- archives locales non suivies par Git : `lexicon/releases/4.00.5/`, si elles ont été générées sur la machine de travail.

L'application affiche cette version sur la page Lexique comme version active. Le manifeste compact est exposé dans `public/static/dictionary/releases/lexique4005.manifest.json` et le fichier complet chargé par le jeu est `public/static/dictionary/lexique4005.txt`.

Depuis son activation, le retour arrière contrôlé vers `3.83.1` se prépare avec :

```bash
npm run lexicon:rollback:active
```

Le dry-run vérifie `public/static/dictionary/lexique383.txt` et affiche les changements prévus. L'application réelle demande une option explicite :

```bash
npm run lexicon:rollback:active -- --apply
```

Analyse des 19 982 mots du candidat absents d'ODS 8 :

- nouveaux mots Lexique 4.00 : 8 765 ;
- formes dérivées déjà présentes dans le dictionnaire courant : 8 568 ;
- mots conservés depuis la revue des retraits 3.83 : 1 453 ;
- mots avec métadonnées lexicales courantes : 1 196 ;
- revue basse fréquence : 12 745 ;
- nouveaux Lexique 4.00 à revoir : 3 860 ;
- conservation avec revue ultérieure : 1 920 ;
- exclusions à forte priorité de revue : 895 ;
- conservation avec attestation d'usage 3.83 : 464 ;
- exclusions à priorité moyenne de revue : 98.

Liste candidate d'exclusions :

- 993 mots proposés ;
- 895 issus de la décision `review-exclusion-high` ;
- 98 issus de la décision `review-exclusion-medium` ;
- 993 proviennent des nouveaux apports Lexique 4.00 ;
- cette liste n'est pas appliquée automatiquement.

Résultat du candidat filtré :

- candidat brut : 370 076 mots ;
- exclusions appliquées : 993 ;
- candidat filtré : 369 083 mots ;
- mots communs avec ODS 8 : 350 094, inchangé ;
- mots du candidat filtré absents d'ODS 8 : 18 989 ;
- mots ODS 8 absents du candidat filtré : 61 336, inchangé ;
- part du candidat filtré acceptée par la référence ODS 8 : 94,86 % ;
- couverture de la référence ODS 8 par le candidat filtré : 85,09 % ;
- mots courts hors ODS restants après filtrage : 65 de 2 lettres, 102 de 3 lettres, 173 de 4 lettres.

Revue spéciale des 340 mots courts restants hors ODS 8 :

- 665 mots courts ont déjà été exclus par la première liste candidate ;
- 340 mots courts restent à examiner ;
- 65 mots de 2 lettres ;
- 102 mots de 3 lettres ;
- 173 mots de 4 lettres ;
- 314 sont présents dans Morphalou et proposés en `review-keep-morphalou` ;
- 23 existent déjà dans Sérénimot avec croisement de source et sont proposés en `keep-existing-cross-sourced` ;
- 3 sont appuyés par Lefff et proposés en `review-keep-lefff`.

Lecture prudente : cette revue ne valide pas automatiquement les mots courts. Elle montre seulement que les petits mots restants disposent d'un appui dans au moins une source ouverte. Vu leur impact sur le jeu, une deuxième vague devra examiner séparément les sigles, unités, abréviations et formes non lexicales.

Signaux de risque principaux :

- mots courts : 1 005 ;
- absents des croisements ouverts Morphalou et Lefff : 5 277 ;
- noms propres signalés par Lefff : 365 ;
- noms propres probables par motif : 101 ;
- fragments grammaticaux : 9.

Ce candidat historique a été publié dans `public/static/dictionary/lexique400-preview.txt`, puis remplacé par `4.00.2`. L'ancien `Lexique Sérénimot 3.83.1` reste conservé dans `public/static/dictionary/lexique383.txt`.

Transformations :

- normalisation Unicode ;
- suppression des accents pour la comparaison ;
- conservation uniquement des entrées alphabétiques simples ;
- conversion en majuscules.
- conservation des mots de 2 à 13 lettres, adaptés au plateau actuel ;
- conservation des catégories grammaticales lexicales courantes ;
- exclusion documentée des abréviations, symboles d'unités et formes tronquées incompatibles avec l'esprit d'un jeu de lettres ;
- ajout des anciens mots de démonstration lorsque nécessaire pour préserver les scénarios de test.

Exclusions initiales :

- `MM` et quelques formes similaires issues d'abréviations ou de symboles ;
- les petits mots lexicalisés restent autorisés lorsqu'ils correspondent à une entrée nominale réelle, par exemple `AA`.

Fichiers du projet :

- source brute locale ignorée par Git : `lexicon/sources/Lexique383.tsv` ;
- générateur : `lexicon/build-lexique-dictionary.mjs` ;
- sortie générée suivie par Git : `public/static/dictionary/lexique383.txt`.
- métadonnées compactes générées : `lexicon/generated/lexique383-metadata.json` ;
- rapport de génération et de filtrage : `lexicon/generated/lexique383-report.json` ;
- exemples de rejets : `lexicon/generated/lexique383-rejections.tsv`.

Le générateur trace notamment :

- les catégories grammaticales complètes et racines ;
- genre, nombre, lemme et informations verbales ;
- fréquences films/livres de la forme et du lemme ;
- nombre de lettres, phonèmes, syllabes, homographes et homophones ;
- informations morphologiques disponibles ;
- raisons de rejet : catégorie non autorisée, mot trop court, mot trop long, forme non alphabétique ou exclusion manuelle ;
- drapeaux d'analyse, par exemple `likely-abbreviation`.

Le fichier de métadonnées utilise des clés compactes :

- `l` : lemmes ;
- `c` : catégories grammaticales ;
- `cr` : racines de catégories ;
- `g` : genres ;
- `n` : nombres ;
- `iv` : informations verbales ;
- `sy` : syllabes ;
- `co` : catégories orthographiques ;
- `md` : morphologie ;
- `fl` : drapeaux ;
- `fq` : fréquences ;
- `lc`, `pc`, `sc` : nombres de lettres, phonèmes et syllabes ;
- `hg`, `hp` : homographes et homophones ;
- `mc` : nombre de morphèmes ;
- `il` : indique si la forme est un lemme.

Commande de régénération :

```bash
npm run lexicon:build
```

Statut : dictionnaire jouable élargi, mais pas encore validé comme dictionnaire officiel de compétition.

## Compatibilité ODS

Sérénimot ne doit pas intégrer directement l'ODS dans son dictionnaire, car cette source n'est pas documentée ici comme redistribuable.

Un pipeline de comparaison peut toutefois être utilisé localement pour mesurer la compatibilité. La source ODS 8 semble plus facile à obtenir que l'ODS 9, donc elle est supportée comme référence principale :

```bash
npm run lexicon:compare:ods8
npm run lexicon:filter:ods8-derived-review
```

Par défaut, ce script attend une source locale non suivie par Git :

```text
lexicon/sources/ods8.txt
```

Cette source doit être fournie légalement par l'utilisateur du projet. Elle reste dans `lexicon/sources/`, dossier ignoré par Git.

Le script génère uniquement un rapport :

```text
lexicon/generated/ods8-compatibility-report.json
```

Le rapport contient :

- le nombre de mots communs ;
- les mots présents dans Sérénimot mais absents de la source ODS ;
- les mots présents dans la source ODS mais absents de Sérénimot ;
- des ratios de couverture ;
- des échantillons limités pour analyse ;
- une répartition par longueur.

Ce rapport sert à décider des filtres futurs, sans copier ODS dans le dictionnaire public du jeu.

Le filtre des formes dérivées en revue génère :

- `lexicon/generated/ods8-derived-review-report.json` ;
- `lexicon/generated/ods8-derived-accepted-candidates.txt` ;
- `lexicon/generated/ods8-derived-rejected-candidates.tsv`.

Pour analyser spécifiquement les mots ODS 8 absents du lexique actif `Lexique Sérénimot 4.00.5`, utiliser :

```bash
npm run lexicon:analyze:ods8-missing-active
npm run lexicon:summarize:ods8-missing-active
```

Dernière analyse locale après activation de `4.00.5` :

- 60 753 mots ODS 8 absents du lexique actif ;
- 42 068 mots hors limite du plateau actuel, car ils dépassent 13 lettres ;
- 18 685 mots jouables à étudier ;
- `review-no-open-source` : 11 228 ;
- `review-verb-inflection` : 3 356 ;
- `review-ambiguous-verb-or-derived` : 1 829 ;
- `review-adjective-or-participle` : 1 149 ;
- `review-derived-noun` : 458 ;
- `exclude-proper-noun` : 339 ;
- `review-short-word` : 186 ;
- `review-open-single-source` : 140.

Décision de méthode : ODS 8 reste une référence de comparaison non intégrée et non distribuée. Les enrichissements doivent venir de règles documentées ou de sources redistribuables, pas d'une insertion directe des mots ODS.

Une commande ODS 9 reste disponible si une source locale compatible est obtenue plus tard :

```bash
npm run lexicon:compare:ods9
```

## Référence Morphalou

Morphalou peut être utilisé comme ressource de comparaison ouverte pour enrichir l'analyse des écarts lexicaux, sans remplacer automatiquement le dictionnaire jouable.

Source :

- Morphalou 3.1, lexique morphologique ouvert du français maintenu par l'ATILF CNRS.
- Page CNRTL : `https://www.cnrtl.fr/lexiques/morphalou/`.
- Miroir Hugging Face utilisé pour récupérer le zip CSV : `https://huggingface.co/datasets/datasets-CNRS/Morphalou`.
- Licence indiquée dans l'archive : LGPL-LR.

Fichiers du projet :

- archive brute locale ignorée par Git : `lexicon/sources/Morphalou3.1_formatCSV_toutEnUn.zip` ;
- générateur : `lexicon/build-morphalou-reference.mjs` ;
- générateur de formes dérivées : `lexicon/build-morphalou-derived-candidates.mjs` ;
- liste normalisée générée et ignorée par Git : `lexicon/generated/morphalou-forms.txt` ;
- formes dérivées acceptées générées et ignorées par Git : `lexicon/generated/morphalou-derived-accepted.txt` ;
- revue des formes dérivées non intégrées automatiquement : `lexicon/generated/morphalou-derived-review.tsv` ;
- rapport de génération : `lexicon/generated/morphalou-report.json` ;
- rapport de formes dérivées : `lexicon/generated/morphalou-derived-report.json` ;
- rapport de comparaison : `lexicon/generated/morphalou-compatibility-report.json`.

Commandes :

```bash
npm run lexicon:build:morphalou
npm run lexicon:derive:morphalou
npm run lexicon:build:with-derived
npm run lexicon:build:with-derived-and-ods8-review
npm run lexicon:build:with-derived-ods8-review-and-imperatives
npm run lexicon:build:auto-exclusions
npm run lexicon:build:full
npm run lexicon:analyze:ods8-priority-review
npm run lexicon:compare:morphalou
```

Transformations :

- lecture du CSV `Morphalou3.1_CSV.csv` depuis l'archive locale ;
- extraction des graphies de lemme et de flexion ;
- rejet des locutions, traits d'union, apostrophes et formes non alphabétiques ;
- suppression des accents pour aligner la comparaison avec les tuiles actuelles ;
- conservation des mots de 2 à 13 lettres ;
- génération d'une liste de référence normalisée utilisable uniquement pour analyse locale.

Les formes dérivées intégrées automatiquement suivent une règle prudente :

- le lemme Morphalou doit déjà exister dans le dictionnaire Sérénimot ;
- la forme dérivée doit être alphabétique, entre 2 et 13 lettres ;
- les familles intégrées sont les pluriels de noms, formes d'adjectifs, participes verbaux et formes verbales indicatives ;
- les autres formes sont mises en revue, notamment conditionnel, impératif, subjonctif, déterminants et pronoms.

Une deuxième vague peut intégrer les formes de revue confirmées par la référence ODS 8 :

- source de travail générée : `lexicon/generated/ods8-derived-accepted-candidates.txt` ;
- provenance tracée dans les métadonnées : `ods8-confirmed-derived` ;
- drapeau compact : `ods8-confirmed-derived` ;
- familles actuellement concernées : conditionnel présent et subjonctif présent ;
- le subjonctif imparfait reste refusé par défaut.

Une troisième vague peut intégrer les impératifs confirmés par la référence ODS 8 :

- source de travail générée : `lexicon/generated/ods8-imperative-accepted-candidates.txt` ;
- provenance tracée dans les métadonnées : `ods8-confirmed-imperative` ;
- drapeau compact : `ods8-confirmed-imperative` ;
- les impératifs absents d'ODS 8 restent en revue.

Les exclusions prudentes sont générées depuis l'analyse ODS 8 :

- source : `lexicon/generated/ods8-exclusion-candidates.tsv` ;
- liste générée : `lexicon/generated/ods8-auto-exclusions.txt` ;
- décision retenue : uniquement `exclude` ;
- exclusions courtes prioritaires : `lexicon/generated/ods8-priority-suggested-exclusions.txt` ;
- exclusions GO2 avec Lefff : `lexicon/generated/ods8-go2-suggested-exclusions.txt` ;
- ces listes sont appliquées dans `npm run lexicon:build:full`.

La vague GO2 cible uniquement des familles à faible risque :

- noms propres détectés par Lefff ;
- noms propres ou gentilés probables ;
- fragments grammaticaux issus de formes avec apostrophe ;
- préfixes ou formes étrangères classées adverbes et absentes des références ouvertes.

La vague GO3 enrichit le dictionnaire à partir des mots ODS 8 encore absents de Sérénimot :

- source intégrable : Morphalou ;
- référence de comparaison non intégrée et non distribuée : ODS 8 ;
- garde-fou : les mots signalés par Lefff comme noms propres ou non lexicaux sont bloqués ;
- sortie intégrée : `lexicon/generated/ods8-go3-morphalou-confirmed-accepted.txt` ;
- flag compact : `morphalou-ods8-filtered`.

Cette vague ajoute des formes Morphalou que le dictionnaire ne contenait pas encore, par exemple des conjugaisons et dérivés attestés, sans distribuer ODS.

## Cartographie GO4 des absents ODS 8

La commande suivante produit une cartographie des mots ODS 8 encore absents après les vagues d'enrichissement :

```bash
npm run lexicon:analyze:ods8-go4-missing
```

Sorties :

- rapport : `lexicon/generated/ods8-go4-missing-report.json` ;
- revue TSV : `lexicon/generated/ods8-go4-missing-review.tsv`.

Cette étape ne modifie pas le dictionnaire. Elle distingue notamment :

- mots jouables en 13 lettres ou moins ;
- mots hors limite du plateau actuel ;
- formes probablement verbales ;
- suffixes verbaux ambigus ;
- noms/dérivés ;
- mots présents ou absents des sources ouvertes ;
- mots bloqués par Lefff comme noms propres ou non lexicaux.

## Génération GO5 par règles

La commande suivante analyse les mots jouables ODS 8 encore absents et détecte les formes générables depuis des lemmes déjà présents dans Sérénimot :

```bash
npm run lexicon:analyze:ods8-go5-rules
```

Pour appliquer la même logique au lexique actif, utiliser :

```bash
npm run lexicon:build:active-preview-metadata
npm run lexicon:analyze:ods8-go5-rules-active
npm run lexicon:review:ods8-go5-rules-active
npm run lexicon:build:lexique400-preview-go5-candidate
npm run lexicon:compare:lexique400-preview-go5-candidate:ods8
```

Sorties :

- rapport : `lexicon/generated/ods8-go5-rule-generation-report.json` ;
- revue TSV : `lexicon/generated/ods8-go5-rule-generation-review.tsv` ;
- formes générées intégrées : `lexicon/generated/ods8-go5-rule-generated-accepted.txt`.

Sorties actives :

- métadonnées : `lexicon/generated/lexique400-preview-metadata.json` ;
- rapport métadonnées : `lexicon/generated/lexique400-preview-metadata-report.json` ;
- rapport : `lexicon/generated/ods8-go5-active-rule-generation-report.json` ;
- revue TSV : `lexicon/generated/ods8-go5-active-rule-generation-review.tsv` ;
- formes générées : `lexicon/generated/ods8-go5-active-rule-generated-accepted.txt` ;
- rapport qualité : `lexicon/generated/ods8-go5-active-quality-report.json` ;
- revue qualité : `lexicon/generated/ods8-go5-active-quality-review.tsv` ;
- candidat augmenté : `lexicon/generated/lexique400-preview-go5-candidate.txt` ;
- rapport du candidat : `lexicon/generated/lexique400-preview-go5-candidate-report.json` ;
- rapport de comparaison ODS 8 : `lexicon/generated/lexique400-preview-go5-candidate-ods8-compatibility-report.json`.

Dernier résultat actif :

- métadonnées actives avant activation GO5 : 368 956 mots couverts sur 368 956 ;
- métadonnées actives après enrichissement GO5 : 369 324 mots couverts sur 369 324 ;
- fiches GO5 générées : 368, rattachées aux lemmes verbaux connus avec le drapeau `rule-generated-ods8-filtered` ;
- lemmes verbaux détectés : 11 808 ;
- 368 formes régulières `-ER` générées ;
- candidat augmenté : 369 324 mots ;
- mots communs avec la référence ODS 8 : 350 462 ;
- mots ODS 8 encore absents : 60 968 ;
- couverture de la référence ODS 8 : 85,18 %.
- revue qualité : 292 formes acceptables automatiquement, 76 acceptées avec note, 0 forme à revoir avant activation, 0 blocage automatique.

La vague GO5 est volontairement stricte :

- seules les formes de verbes en `-ER` actuellement modélisées sont générées ;
- le lemme infinitif doit déjà être accepté par Sérénimot ;
- ODS 8 sert uniquement de référence de comparaison pour éviter de générer trop large ;
- les formes non rattachées à un verbe accepté restent en revue.

## Génération GO6 complémentaire

GO6 complète GO5 sans activer directement un nouveau lexique :

- compléments réguliers `-ER` : présent 1re et 2e personnes du pluriel, futur simple 1re/2e/3e personnes du singulier, passé simple 1re/2e/3e personnes du singulier et 1re/2e personnes du pluriel ;
- formes régulières `-IR` en `-ISS-` : présent 1re/2e personnes du pluriel, imparfait 1re/2e/3e personnes du singulier, participe présent ;
- garde-fou : le lemme doit déjà être un verbe connu dans le lexique actif ;
- ODS 8 reste uniquement une référence de comparaison de compatibilité.

Commandes :

```bash
npm run lexicon:analyze:ods8-go6-rules-active
npm run lexicon:review:ods8-go6-rules-active
npm run lexicon:filter:ods8-go6-rules-active
npm run lexicon:build:lexique400-go6-candidate
npm run lexicon:compare:lexique400-go6-candidate:ods8
```

Résultat local :

- formes GO6 détectées : 214 ;
- formes prêtes à activation : 213 ;
- forme mise en revue avant activation : `TIPA`, car c'est un mot de 4 lettres ;
- métadonnées actives après activation GO6 : 369 537 mots couverts sur 369 537 ;
- candidat GO6 : 369 537 mots ;
- mots communs avec la référence ODS 8 : 350 675 ;
- mots ODS 8 encore absents du candidat : 60 755 ;
- mots du candidat absents d'ODS 8 : 18 862, inchangé ;
- part du candidat acceptée par la référence ODS 8 : 94,90 % ;
- couverture de la référence ODS 8 : 85,23 %.

Après activation en `4.00.5`, la nouvelle synthèse des absents ODS 8 est :

- 60 753 mots ODS 8 absents du lexique actif ;
- 18 685 mots jouables à étudier ;
- `review-no-open-source` : 11 228 ;
- `review-verb-inflection` : 3 356 ;
- `review-ambiguous-verb-or-derived` : 1 829 ;
- `review-adjective-or-participle` : 1 149 ;
- `review-derived-noun` : 458 ;
- `exclude-proper-noun` : 339 ;
- `review-short-word` : 186 ;
- `review-open-single-source` : 140.

## Revue stricte des petits mots actifs

GO A ajoute une barrière spécifique pour les mots de 2 à 4 lettres, car ils changent fortement la jouabilité et paraissent souvent arbitraires aux joueurs.

Commandes :

```bash
npm run lexicon:review:active-short-words
npm run lexicon:build:active-short-words-candidate
npm run lexicon:compare:active-short-words-candidate:ods8
```

Résultat :

- 216 petits mots revus : 188 mots marqués `review-short-word` et 28 mots courts marqués `exclude-proper-noun` ;
- 1 mot accepté : `TIPA`, forme courte générée par règle depuis le lemme verbal `TIPER` déjà accepté ;
- 187 mots gardés en attente : 186 mots uniquement vus via la comparaison avec la référence ODS 8, plus `DIAM` présent dans Morphalou mais encore sans explication validée ;
- 28 mots rejetés : noms propres ou assimilés détectés par Lefff ;
- version activée `4.00.4` : 369 538 mots ;
- compatibilité avec la référence ODS 8 du candidat : 350 676 mots communs, 60 754 mots ODS 8 encore absents, 18 862 mots Sérénimot absents d'ODS 8.

Règle juridique et produit : ODS 8 reste une référence de comparaison non intégrée et non distribuée uniquement. Un petit mot n'est pas intégré parce qu'il est dans ODS ; il doit être appuyé par une source redistribuable ou par une règle Sérénimot documentée.

État post-activation `4.00.4`, avant revue GO B :

- 215 petits mots restent en revue ;
- aucun nouveau mot court n'est immédiatement acceptable ;
- `DIAM` reste en attente ;
- le candidat généré depuis `4.00.4` reste à 369 538 mots.

## Revue manuelle GO B : DIAM

GO B tranche le cas `DIAM`, laissé en attente par GO A.

Décision :

- `DIAM` est accepté dans `4.00.5` ;
- `DIAMS` était déjà actif, donc refuser le singulier tout en gardant le pluriel créait une incohérence ;
- Lexique 3.83 et Lexique 4.00 contiennent `diam` comme nom masculin singulier ;
- Lexique 4.00 rattache la morphologie à `diamant` ;
- Morphalou contient la forme normalisée `DIAM` ;
- La référence ODS 8 confirme la compatibilité, sans être intégrée ni redistribuée.

Résultat après activation :

- lexique actif : 369 539 mots ;
- mots communs avec la référence ODS 8 : 350 677 ;
- mots ODS 8 encore absents : 60 753 ;
- petits mots encore gardés en attente : 186 ;
- métadonnées compactes : 369 539 mots couverts sur 369 539.

## Explications pré-calculées

Les explications de mots sont séparées du fichier de mots jouables. Elles sont générées et revues avant intégration. Le fichier complet est conservé dans l'archive de release :

```text
lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json
```

L'application charge uniquement des fichiers segmentés, afin d'éviter de distribuer un gros JSON inutile au démarrage :

```text
public/static/dictionary/lexique4005.explanations-2.json
public/static/dictionary/lexique4005.explanations-3.json
public/static/dictionary/lexique4005.explanations-a.json
...
```

Les segments publics par longueur sont volontairement limités aux mots de 2 à 4 lettres, chargés dès la partie. Les mots plus longs sont disponibles par initiale, ce qui évite de dupliquer le même contenu en public.

Première vague :

- `DIAM` : nom masculin familier lié à `diamant`, revu avec Lexique 3.83, Lexique 4.00 et Morphalou ;
- `TIPA` : forme conjuguée de `tiper`, issue d'une règle Sérénimot documentée.
- 98 autres mots courts ou rares déjà jouables, notamment `AA`, `AMI`, `ARE`, `BLE`, `EAU`, `ERG`, `KIF`, `QI`, `PSST`, `WOK`, `YEN`, `YIN`, `YANG` et `ZEN`.

Deuxième vague :

- 100 fiches supplémentaires pour des mots courts et fréquents déjà jouables ;
- priorité donnée aux singuliers/pluriels utiles en partie, par exemple `ABRI`/`ABRIS`, `CAFE`/`CAFES`, `FETE`/`FETES`, `JEU`/`JEUX`, `LUNE`/`LUNES`, `MAIN`/`MAINS`.

Troisième vague :

- 54 fiches supplémentaires pour les mots très fréquents et les formes prioritaires déjà jouables ;
- ajout de mots-outils utiles en croisement, par exemple `JE`, `DE`, `LE`, `LA`, `UN`, `UNE`, `QUE`, `QUI`, `EN`, `ET`, `SE`, `TE`, `ME` ;
- ajout de bases verbales et de formes reliées sans duplication de définition, par exemple `ALLER`/`VA`, `AVOIR`/`AI`/`AVEZ`, `POUVOIR`/`PU`, `VOIR`/`VU`.

Après cette troisième vague : 257 fiches explicatives revues.

Quatrième vague :

- 92 fiches supplémentaires pour des formes très fréquentes sorties de la file GO B ;
- ajout de bases verbales utiles : `FAIRE`, `SAVOIR`, `DIRE`, `DEVOIR`, `VOULOIR`, `VENIR`, `VIVRE` ;
- rattachement de formes conjuguées fréquentes, par exemple `FIT`/`FIS`/`FONT` vers `FAIRE`, `DIT`/`DIS` vers `DIRE`, `SU`/`SUT` vers `SAVOIR`, `VEUX`/`VEUT` vers `VOULOIR`, `DUT`/`DUE` vers `DEVOIR`, `VONT`/`VAIS`/`IREZ` vers `ALLER` ;
- ajout de mots-outils ou possessifs très utiles en partie, par exemple `LES`, `AU`, `DES`, `SI`, `OH`, `SA`, `MA`, `MON`, `MES`, `TON`, `VOS`, `SUR`, `PAR`, `OU`, `NON`.

Total actuel : 349 fiches explicatives revues.

Cinquième vague :

- 48 fiches supplémentaires pour compléter tous les mots de 2 lettres du lexique actif ;
- couverture obtenue : 90 mots de 2 lettres expliqués sur 90 ;
- ajout d'un test automatique pour empêcher une régression sur cette couverture.

Total actuel : 397 fiches explicatives revues.

Sixième vague :

- génération de 535 fiches courtes pour les mots de 3 lettres qui n'avaient pas encore de fiche ;
- couverture obtenue : 640 mots de 3 lettres expliqués sur 640 ;
- 516 fiches générées sont préremplies avec une définition extraite de Wiktionnaire ;
- 19 fiches générées gardent une explication générique issue des métadonnées Lexique, faute de définition Wiktionnaire exploitable automatiquement ;
- les fiches générées utilisent aussi les métadonnées Lexique disponibles : catégorie grammaticale, genre/nombre et lemme quand il existe ;
- elles sont marquées `reviewed=false` et les fiches manuelles restent prioritaires ;
- ajout d'un générateur reproductible : `lexicon/build-three-letter-explanations.mjs`.
- ajout d'un récupérateur traçable : `lexicon/fetch-three-letter-wiktionary-definitions.mjs`.

Après cette sixième vague : 932 fiches explicatives pré-calculées, dont 397 revues manuellement et 535 générées pour les mots de 3 lettres.

Septième vague :

- génération de 2 486 fiches courtes pour les mots de 4 lettres qui n'avaient pas encore de fiche ;
- couverture obtenue : 2 606 mots de 4 lettres expliqués sur 2 606 ;
- 2 401 fiches générées sont préremplies depuis le dump Wiktionnaire local ;
- 85 fiches générées gardent une explication générique issue des métadonnées Lexique ;
- les fiches générées sont marquées `reviewed=false` et les fiches manuelles restent prioritaires ;
- ajout d'un générateur réutilisable par longueur : `lexicon/build-generated-word-explanations.mjs`.

À ce stade : 3 418 fiches explicatives pré-calculées, dont 397 revues manuellement et 3 021 générées pour les mots de 3 et 4 lettres.
Les pluriels et formes liées réutilisent la définition de leur lemme quand celui-ci existe dans les fiches, afin d'éviter les doublons et d'afficher une explication compacte.

Huitième vague :

- génération de 8 362 fiches courtes pour les mots de 5 lettres qui n'avaient pas encore de fiche ;
- couverture obtenue : 8 432 mots de 5 lettres expliqués sur 8 432 ;
- 8 111 fiches générées sont préremplies depuis le dump Wiktionnaire local ;
- 251 fiches générées gardent une explication générique issue des métadonnées Lexique ;
- les fiches générées sont marquées `reviewed=false` et les fiches manuelles restent prioritaires ;
- les pluriels et formes liées réutilisent aussi la définition de leur lemme quand celui-ci existe.

À ce stade : 11 780 fiches explicatives pré-calculées, dont 397 revues manuellement et 11 383 générées pour les mots de 3, 4 et 5 lettres.

Neuvième vague :

- génération de 18 304 fiches courtes pour les mots de 6 lettres qui n'avaient pas encore de fiche ;
- couverture obtenue : 18 314 mots de 6 lettres expliqués sur 18 314 ;
- 17 891 fiches générées sont préremplies depuis le dump Wiktionnaire local ;
- 413 fiches générées gardent une explication générique issue des métadonnées Lexique ;
- les fiches générées sont marquées `reviewed=false` et les fiches manuelles restent prioritaires.

Total actuel : 30 084 fiches explicatives pré-calculées, dont 397 revues manuellement et 29 687 générées pour les mots de 3, 4, 5 et 6 lettres.

Les fiches complètes sont conservées dans l'archive de release. L'application publique expose seulement les segments utiles au chargement progressif :

- `lexique4005.explanations-2.json` : 82 fiches ;
- `lexique4005.explanations-3.json` : 640 fiches ;
- `lexique4005.explanations-4.json` : 2 606 fiches ;
- `lexique4005.explanations-a.json` à `lexique4005.explanations-z.json` : chargement à la demande par initiale.

L'application charge les fiches 2 à 4 lettres pour la partie, puis les fiches plus longues uniquement au besoin par initiale.

Les fiches publiques sont régénérées depuis la source TypeScript avec :

```bash
npm run lexicon:fetch:three-letter-definitions
npm run lexicon:build:three-letter-explanations
npm run lexicon:build:four-letter-explanations
npm run lexicon:build:five-letter-explanations
npm run lexicon:build:six-letter-explanations
npm run lexicon:export:explanations
```

Pour les vagues larges, Wiktionnaire peut aussi être traité depuis le dump officiel local :

```bash
npm run lexicon:download:wiktionary
npm run lexicon:extract:wiktionary
```

Le dump source `frwiktionary-latest-pages-articles.xml.bz2` reste dans `lexicon/sources/`, dossier
ignoré par Git. Le fichier redistribuable doit être le résultat compact et attribué du pipeline, pas
le dump brut complet.

Extraction locale réalisée le 4 août 2026 :

- pages Wiktionnaire parcourues : 7 734 547 ;
- mots du lexique actif ciblés : 369 539 ;
- définitions uniques extraites : 360 274 ;
- couverture Wiktionnaire du lexique actif : 97,49 % ;
- sortie compacte : `lexicon/generated/wiktionary-definitions.json`.

Le jeu affiche ces fiches dans le détail du score et dans le bloc visible "Pourquoi ce mot est accepté ?" lorsqu'un mot concerné est posé.

## Référence Lefff

Lefff peut être utilisé comme ressource ouverte complémentaire pour les formes fléchies du français.

Source :

- Lefff 3.4, lexique morphologique et syntaxique du français.
- Page ALMAnaCH/Inria : `https://almanach.inria.fr/software_and_resources/Alexina-fr.html`.
- Publication à citer : Benoît Sagot, "The Lefff, a freely available and large-coverage morphological and syntactic lexicon for French", LREC 2010.
- Licence du fichier local utilisé : LGPL-LR.
- Source de récupération locale utilisée pour l'analyse : paquet npm `node-lefff@0.3.1`, qui contient `src/lefff-3.4.mlex/lefff-3.4.mlex`.

Fichiers du projet :

- source brute locale ignorée par Git : `lexicon/sources/lefff-3.4.mlex` ;
- générateur : `lexicon/build-lefff-reference.mjs` ;
- analyseur de couverture : `lexicon/analyze-lefff-enrichment.mjs` ;
- liste normalisée générée et ignorée par Git : `lexicon/generated/lefff-forms.txt` ;
- métadonnées générées et ignorées par Git : `lexicon/generated/lefff-metadata.json` ;
- rapport de génération : `lexicon/generated/lefff-report.json` ;
- rapport d'enrichissement : `lexicon/generated/lefff-enrichment-report.json` ;
- candidats d'enrichissement : `lexicon/generated/lefff-enrichment-candidates.tsv`.
- formes haute confiance intégrables : `lexicon/generated/lefff-high-confidence-accepted.txt` ;
- rapport haute confiance : `lexicon/generated/lefff-high-confidence-report.json`.

Commandes :

```bash
npm run lexicon:build:lefff
npm run lexicon:analyze:lefff-enrichment
npm run lexicon:build:lefff-high-confidence
```

Lefff n'est pas intégré automatiquement au dictionnaire jouable. Il sert d'abord à classer les formes manquantes :

- `high-confidence-cross-source` : forme absente de Sérénimot, présente dans Lefff, Morphalou et la référence ODS 8 ;
- `ods8-confirmed` : forme absente de Sérénimot, présente dans Lefff et la référence ODS 8 ;
- `morphalou-confirmed` : forme absente de Sérénimot, présente dans Lefff et Morphalou ;
- `short-manual-review` : forme courte à revoir humainement ;
- `lefff-only-review` : forme attestée seulement par Lefff dans les sources locales disponibles.

La vague haute confiance utilise uniquement `high-confidence-cross-source`. Une forme doit donc être :

- absente du dictionnaire Sérénimot courant ;
- présente dans Lefff ;
- présente dans Morphalou ;
- présente dans la référence ODS 8.

ODS 8 ne fournit pas les mots à distribuer : il sert seulement de référence de comparaison pour prioriser les formes déjà attestées dans deux ressources ouvertes.

## Production

Avant toute version publique, vérifier les obligations exactes de la licence CC BY-SA 4.0 pour la distribution de la liste générée, en particulier l'attribution, le partage dans les mêmes conditions et la mise à disposition des transformations.

Ne pas importer de dictionnaire propriétaire ou de liste trouvée sans licence explicite.
