# Chantier lexique

Ce dossier regroupe la construction et l'analyse du lexique. Il est volontairement séparé de l'application React.

Voir aussi `lexicon/RESOURCES.md` pour le rôle de chaque ressource externe dans les décisions lexicales.
Voir `lexicon/SHORT_WORD_POLICY.md` pour la politique produit des mots courts, et `lexicon/short-word-policy.json` pour la version structurée réutilisable par le pipeline.

## Entrées locales

Les sources lexicales brutes restent dans :

```text
lexicon/sources/
```

Ce dossier est ignoré par Git. Il peut contenir par exemple :

- `Lexique383.tsv` ;
- `Lexique400.tsv`, pour comparer la migration possible depuis Lexique 3.83 sans modifier le lexique jouable ;
- `ods8.txt`, si une source ODS 8 légalement obtenue est disponible localement ;
- `ods9.txt`, si une source ODS 9 légalement obtenue devient disponible localement.
- `Morphalou3.1_formatCSV_toutEnUn.zip`, téléchargé depuis une source Morphalou officielle ou miroir documenté.
- `lefff-3.4.mlex`, ou une archive `.zip` / `.gz` contenant Lefff, obtenue depuis une source documentée.

## Sorties de travail

Les rapports et métadonnées de travail sont générés dans :

```text
lexicon/generated/
```

Ce dossier est ignoré par Git, car certains fichiers peuvent être volumineux. Les fichiers exposés à l'application sont le dictionnaire jouable final et les segments d'explications réellement chargés par l'interface :

```text
public/static/dictionary/lexique4005.txt
public/static/dictionary/lexique4005.explanations-*.json
public/static/dictionary/lexique4005.explanations.manifest.json
```

L'ancien dictionnaire `public/static/dictionary/lexique383.txt` reste conservé pour retour arrière.

Les archives complètes de prévisualisation et de release peuvent exister localement dans `lexicon/previews/` et `lexicon/releases/`, mais ces dossiers ne sont pas suivis par Git. Pour GitHub, seuls les fichiers nécessaires à l'application restent dans `public/static/dictionary/`.

## Commandes

Construire le lexique jouable et les rapports :

```bash
npm run lexicon:build
```

Comparer Lexique 3.83 avec Lexique 4.00 sans migrer le dictionnaire jouable :

```bash
npm run lexicon:compare:lexique400
```

Cette commande génère un rapport JSON et une revue TSV des mots qui disparaîtraient :

```text
lexicon/generated/lexique400-migration-report.json
lexicon/generated/lexique400-migration-report-removed-review.tsv
```

Construire un candidat local non activé `4.00.1-preview` :

```bash
npm run lexicon:build:lexique400-candidate
```

Comparer ce candidat avec ODS 8 local :

```bash
npm run lexicon:compare:lexique400-candidate:ods8
```

Analyser les mots du candidat absents d'ODS 8 :

```bash
npm run lexicon:analyze:lexique400-candidate:ods8-only
```

Générer une liste candidate d'exclusions, sans l'appliquer :

```bash
npm run lexicon:build:lexique400-candidate-suggested-exclusions
```

Construire le candidat filtré avec cette liste, sans activer le dictionnaire dans le jeu :

```bash
npm run lexicon:build:lexique400-candidate-filtered
npm run lexicon:compare:lexique400-candidate-filtered:ods8
```

Générer une revue spéciale des mots courts restants hors ODS 8 :

```bash
npm run lexicon:review:lexique400-short-words
```

Générer une deuxième vague prudente d'exclusions proposées pour les mots courts très suspects, sans l'appliquer :

```bash
npm run lexicon:build:lexique400-short-word-suggested-exclusions
```

Construire le candidat filtré bis avec cette deuxième vague, toujours sans activer le dictionnaire du jeu :

```bash
npm run lexicon:build:lexique400-candidate-filtered-short
npm run lexicon:compare:lexique400-candidate-filtered-short:ods8
```

Générer une revue lisible des mots courts restants :

```bash
npm run lexicon:review:lexique400-remaining-short-words
```

Figer la preview locale versionnée, sans l'activer dans le jeu :

```bash
npm run lexicon:build:lexique400-preview
```

Préparer un retour arrière vers le lexique `3.83.1` :

```bash
npm run lexicon:rollback:active
```

Cette commande est un dry-run par défaut. Elle vérifie que `public/static/dictionary/lexique383.txt` existe et contient 359 420 mots, puis affiche les fichiers qui seraient modifiés. Pour appliquer réellement le retour arrière :

```bash
npm run lexicon:rollback:active -- --apply
```

Ces commandes génèrent :

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

La vague mots courts proposée signale 127 exclusions candidates sur 340 mots revus : 55 mots de 2 lettres, 62 mots de 3 lettres et 10 mots de 4 lettres. Les règles restent prudentes : ne pas retirer les mots déjà présents dans le lexique Sérénimot courant, cibler les nouveaux mots Lexique 4.00 absents d'ODS 8, et tracer les signaux `sans-voyelle-suspect-sigle`, `categorie-numerale-ou-unite`, `categorie-non-lexicale` ou `tres-faible-frequence-absent-lefff`. Les onomatopées et interjections restent en revue séparée.

Résultat du candidat filtré bis :

- candidat filtré précédent : 369 083 mots ;
- exclusions mots courts appliquées : 127 ;
- candidat filtré bis : 368 956 mots ;
- mots communs avec ODS 8 : 350 094, inchangé ;
- mots du candidat filtré bis absents d'ODS 8 : 18 862 ;
- mots ODS 8 absents du candidat filtré bis : 61 336, inchangé ;
- part du candidat filtré bis acceptée par ODS 8 local : 94,89 % ;
- couverture ODS 8 locale par le candidat filtré bis : 85,09 % ;
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

Politique associée :

```text
lexicon/SHORT_WORD_POLICY.md
lexicon/short-word-policy.json
```

Ancienne étape remplacée `4.00.1-preview` :

- mots : 368 956 ;
- statut : étape remplacée par `4.00.2` ;
- SHA-256 : `06a67197d285f6bbf73fe730f062648d356fd93d6b56fff83b8b0ab38d968c72` ;
- fichier de mots : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.txt` ;
- ancien fichier public : `public/static/dictionary/lexique400-preview.txt` ;
- manifeste : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.manifest.json` ;
- notes : `lexicon/previews/4.00.1-preview/serenimot-lexicon-4.00.1-preview.notes.md`.

La page Lexique de l'application n'affiche plus cette étape comme version active.

Version remplacée `4.00.2` :

- mots : 369 324 ;
- statut : version remplacée par `4.00.3` ;
- SHA-256 : `eae1ec09d39ca9033fd5de6361087592cd30f72279b92dae8c94e8934990b576` ;
- fichier de mots : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.txt` ;
- ancien fichier public : `public/static/dictionary/lexique4002.txt` ;
- manifeste : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.manifest.json` ;
- notes : `lexicon/releases/4.00.2/serenimot-lexicon-4.00.2.notes.md`.

La page Lexique de l'application n'affiche plus cette version comme active.

Version remplacée `4.00.3` :

- mots : 369 537 ;
- statut : version remplacée par `4.00.4` ;
- SHA-256 : `6c9b4eb869e5253803eddaed7f0c669508094060c9cbe26920047493c44c71e6` ;
- fichier de mots : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.txt` ;
- ancien fichier public : `public/static/dictionary/lexique4003.txt` ;
- manifeste : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.manifest.json` ;
- notes : `lexicon/releases/4.00.3/serenimot-lexicon-4.00.3.notes.md`.

La page Lexique de l'application n'affiche plus cette version comme active.

Version remplacée `4.00.4` :

- mots : 369 538 ;
- statut : version remplacée par `4.00.5` ;
- SHA-256 : `8e52b3e9fc47032d95292c09f81d4502f94df3b9d1075920c493abd513861412` ;
- fichier de mots : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.txt` ;
- ancien fichier public : `public/static/dictionary/lexique4004.txt` ;
- manifeste : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.manifest.json` ;
- notes : `lexicon/releases/4.00.4/serenimot-lexicon-4.00.4.notes.md`.

La page Lexique de l'application n'affiche plus cette version comme active.

Version activée `4.00.5` :

- mots : 369 539 ;
- statut : version active dans l'application ;
- changement principal : ajout de `DIAM` après revue manuelle GO B ;
- SHA-256 : `e3113ad66fbb72095685ed03788f2bbd6ba19b800ffc03f1e5b4609729a57fe9` ;
- fichier de mots : `lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.txt` ;
- fichier public actif : `public/static/dictionary/lexique4005.txt` ;
- manifeste : `lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.manifest.json` ;
- explications : `lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json` ;
- notes : `lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.notes.md`.

La page Lexique de l'application affiche cette version comme active via le manifeste public compact `public/static/dictionary/releases/lexique4005.manifest.json`. Le fichier complet actif est `public/static/dictionary/lexique4005.txt`.

Retour arrière : `npm run lexicon:rollback:active -- --apply` restaure le chargement de `public/static/dictionary/lexique383.txt`, remet la version affichée à `3.83.1` et repasse le manifeste actif en non actif.

Analyser les mots ODS 8 absents du lexique actif `4.00.5`, sans intégrer ni redistribuer ODS :

```bash
npm run lexicon:analyze:ods8-missing-active
npm run lexicon:summarize:ods8-missing-active
```

Ces commandes génèrent :

```text
lexicon/generated/ods8-missing-active-report.json
lexicon/generated/ods8-missing-active-review.tsv
lexicon/generated/ods8-missing-active-summary.json
lexicon/generated/ods8-missing-active-priority.tsv
```

Synthèse actuelle après activation de `4.00.5` :

- mots ODS 8 absents du lexique actif : 60 753 ;
- hors limite du plateau actuel, donc plus de 13 lettres : 42 068 ;
- jouables sur le plateau actuel : 18 685 ;
- `review-no-open-source` : 11 228 ;
- `review-verb-inflection` : 3 356 ;
- `review-ambiguous-verb-or-derived` : 1 829 ;
- `review-adjective-or-participle` : 1 149 ;
- `review-derived-noun` : 458 ;
- `exclude-proper-noun` : 339 ;
- `review-short-word` : 186 ;
- `review-open-single-source` : 140.

Recommandations produites pour les 19 268 mots jouables :

- `review-no-open-source` : 11 441 mots sans confirmation Morphalou/Lefff ;
- `review-verb-inflection` : 3 561 formes verbales probables ;
- `review-ambiguous-verb-or-derived` : 1 943 formes ambiguës ;
- `review-adjective-or-participle` : 1 169 adjectifs ou participes probables ;
- `review-derived-noun` : 460 noms dérivés probables ;
- `exclude-proper-noun` : 339 noms propres détectés par Lefff ;
- `review-short-word` : 188 petits mots à revoir très strictement ;
- `review-open-single-source` : 167 mots confirmés par une seule ressource ouverte.

Lecture produit : ne pas chercher à couvrir les 61 336 mots en bloc. La priorité utile est d'abord de confirmer ou générer par règles les formes verbales, adjectivales et nominales issues de lemmes déjà acceptés, puis de garder les mots sans source ouverte en revue jusqu'à obtention d'une ressource redistribuable plus solide.

Générer une première vague active par règles régulières `-ER`, puis construire un candidat non activé :

```bash
npm run lexicon:build:active-preview-metadata
npm run lexicon:analyze:ods8-go5-rules-active
npm run lexicon:review:ods8-go5-rules-active
npm run lexicon:build:lexique400-preview-go5-candidate
npm run lexicon:compare:lexique400-preview-go5-candidate:ods8
```

Sorties :

```text
lexicon/generated/lexique400-preview-metadata.json
lexicon/generated/lexique400-preview-metadata-report.json
lexicon/generated/ods8-go5-active-rule-generation-report.json
lexicon/generated/ods8-go5-active-rule-generation-review.tsv
lexicon/generated/ods8-go5-active-rule-generated-accepted.txt
lexicon/generated/ods8-go5-active-quality-report.json
lexicon/generated/ods8-go5-active-quality-review.tsv
lexicon/generated/lexique400-preview-go5-candidate.txt
lexicon/generated/lexique400-preview-go5-candidate-report.json
lexicon/generated/lexique400-preview-go5-candidate-ods8-compatibility-report.json
```

Résultat GO5 actif :

- mots jouables ODS 8 encore absents analysés : 19 268 ;
- mots actifs couverts par des métadonnées : 368 956 sur 368 956 ;
- lemmes verbaux détectés dans les métadonnées actives : 11 808 ;
- formes régulières `-ER` générées depuis un lemme verbal déjà accepté : 368 ;
- mots du candidat augmenté : 369 324 ;
- mots communs avec ODS 8 local : 350 462 ;
- mots ODS 8 encore absents du candidat augmenté : 60 968 ;
- mots du candidat augmenté absents d'ODS 8 : 18 862, inchangé ;
- part du candidat augmenté acceptée par ODS 8 local : 94,89 % ;
- couverture ODS 8 locale : 85,18 %.

Revue qualité GO5 :

- formes GO5 analysées : 368 ;
- blocage automatique avant activation : 0 ;
- acceptation automatique stricte : 292 ;
- acceptation avec note : 76 ;
- revue avant activation : 0 ;
- notes : 60 formes au subjonctif imparfait, 16 formes avec double lecture grammaticale normale ;
- aucun lemme inféré : les 368 formes sont rattachées à des lemmes verbaux présents dans les métadonnées actives.
- métadonnées enrichies : 369 324 mots actifs couverts sur 369 324 ;
- fiches GO5 générées : 368, avec lemme, catégorie `VER`, information verbale et drapeau `rule-generated-ods8-filtered`.

Statut : candidat activé depuis `4.00.2`. Cette vague confirme la stratégie : améliorer la couverture par règles rattachées à des lemmes déjà acceptés, sans copier directement une liste ODS.

Générer une vague GO6 complémentaire, sans activer le dictionnaire :

```bash
npm run lexicon:analyze:ods8-go6-rules-active
npm run lexicon:review:ods8-go6-rules-active
npm run lexicon:filter:ods8-go6-rules-active
npm run lexicon:build:lexique400-go6-candidate
npm run lexicon:compare:lexique400-go6-candidate:ods8
```

Résultat GO6 :

- formes détectées : 214 ;
- formes prêtes à activation : 213 ;
- forme conservée en revue : `TIPA`, petit mot de 4 lettres ;
- métadonnées actives après activation GO6 : 369 537 mots couverts sur 369 537 ;
- candidat GO6 : 369 537 mots ;
- mots communs avec ODS 8 local : 350 675 ;
- mots ODS 8 encore absents du candidat : 60 755 ;
- mots du candidat absents d'ODS 8 : 18 862, inchangé ;
- part du candidat acceptée par ODS 8 local : 94,90 % ;
- couverture ODS 8 locale : 85,23 %.

Après activation en `4.00.5`, il reste 60 753 mots ODS 8 absents du lexique actif, dont 18 685 jouables sur le plateau actuel.

Revue stricte des petits mots encore absents :

```bash
npm run lexicon:review:active-short-words
npm run lexicon:build:active-short-words-candidate
npm run lexicon:compare:active-short-words-candidate:ods8
```

Sorties :

```text
lexicon/generated/active-short-words-review.tsv
lexicon/generated/active-short-words-accepted.txt
lexicon/generated/active-short-words-review-report.json
lexicon/generated/lexique400-active-short-words-candidate.txt
lexicon/generated/lexique400-active-short-words-candidate-report.json
lexicon/generated/lexique400-active-short-words-candidate-ods8-compatibility-report.json
```

Résultat GO A :

- petits mots revus : 216 ;
- mot court accepté par règle documentée : `TIPA`, rattaché au lemme verbal `TIPER` déjà accepté ;
- mots courts gardés en attente : 187, dont 186 uniquement vus par la comparaison ODS 8 locale et `DIAM` présent dans Morphalou mais encore sans explication validée ;
- mots courts rejetés : 28 noms propres ou assimilés signalés par Lefff ;
- version activée `4.00.4` : 369 538 mots ;
- mots communs avec ODS 8 local : 350 676 ;
- mots ODS 8 encore absents du candidat : 60 754 ;
- mots du candidat absents d'ODS 8 : 18 862, inchangé ;
- part du candidat acceptée par ODS 8 local : 94,90 % ;
- couverture ODS 8 locale : 85,23 %.

Décision produit : la revue GO A ne copie aucun mot ODS. Elle ajoute seulement un mot court explicable par une règle Sérénimot et maintient tous les mots ODS-only en attente. Cette revue est activée dans la version `4.00.4`.

État post-activation :

- petits mots encore revus par `npm run lexicon:review:active-short-words` : 215 ;
- nouveau mot immédiatement acceptable : 0 ;
- mots gardés en attente : 187 ;
- mots rejetés : 28 ;
- candidat généré depuis `4.00.4` : 369 538 mots, aucun ajout appliqué.

Revue manuelle GO B :

- mot accepté : `DIAM` ;
- justification : nom masculin singulier attesté dans Lexique 3.83 et Lexique 4.00, présent dans Morphalou, cohérent avec `DIAMS` déjà actif ;
- ODS 8 local confirme la compatibilité mais n'est pas intégré au lexique public ;
- version activée `4.00.5` : 369 539 mots ;
- mots communs avec ODS 8 local : 350 677 ;
- mots ODS 8 encore absents : 60 753 ;
- petits mots encore gardés en attente : 186 ;
- métadonnées compactes : 369 539 mots couverts sur 369 539.
- explications pré-calculées : 170 129 mots courts, rares ou fréquents, dont tous les mots de 2 à 9 lettres du lexique actif.
- fiches revues manuellement : 397, dont les 90 mots de 2 lettres, `DIAM`, `TIPA`, `ETRE`, `METTRE`, `ALLER`, `AVOIR`, `FAIRE`, `SAVOIR`, `DIRE`, `VOIR`, `POUVOIR`, `VOULOIR`, `VENIR`, `AMI`, `ABRI`, `CAFE`, `FETE`, `JEU`, `LUNE`, `MAIN`, `WOK`, `YEN`, `YIN`, `YANG` et `ZEN`.
- fiches de 3 lettres générées : 535, produites depuis les métadonnées Lexique et marquées `reviewed=false`.
- définitions Wiktionnaire préremplies : 516 fiches de 3 lettres générées ; les 19 restantes gardent une explication générique issue des métadonnées Lexique.
- formes liées : les pluriels et formes fléchies réutilisent la définition du lemme quand celui-ci existe, sans dupliquer une deuxième définition dans la fiche.
- fiches de 4 lettres générées : 2 486, dont 2 401 préremplies depuis le dump Wiktionnaire local et 85 avec fallback Lexique.
- fiches de 5 lettres générées : 8 362, dont 8 111 préremplies depuis le dump Wiktionnaire local et 251 avec fallback Lexique.
- fiches de 6 lettres générées : 18 304, dont 17 891 préremplies depuis le dump Wiktionnaire local et 413 avec fallback Lexique.
- export public par longueur : `lexique4005.explanations-2.json` à `lexique4005.explanations-4.json`.
- export public par initiale : `lexique4005.explanations-a.json` à `lexique4005.explanations-z.json`, chargé au besoin par la page Lexique.
- archive de release locale : les segments par longueur 2 à 9 peuvent être conservés hors Git dans `lexicon/releases/4.00.5/`.
- chargement dans l'application : les fiches 2 à 4 lettres sont chargées pour la partie ; les autres fiches sont chargées à la demande par initiale.
- formes conjuguées reliées à leur base : `ETES` vers `ETRE`, `MIS` vers `METTRE`, `TIPA` vers `TIPER`, `VA`/`VAIS`/`IREZ` vers `ALLER`, `AI`/`AVEZ` vers `AVOIR`, `FIT` vers `FAIRE`, `DIT` vers `DIRE`, `SU` vers `SAVOIR`, `PU` vers `POUVOIR`, `VEUX` vers `VOULOIR` et `VU` vers `VOIR`, sans recopier les définitions.

Régénérer les fichiers publics d'explications pré-calculées :

```bash
npm run lexicon:fetch:three-letter-definitions
npm run lexicon:build:three-letter-explanations
npm run lexicon:build:four-letter-explanations
npm run lexicon:build:five-letter-explanations
npm run lexicon:build:six-letter-explanations
npm run lexicon:export:explanations
```

La récupération Wiktionnaire produit un cache local traçable dans
`lexicon/generated/three-letter-wiktionary-definitions.json` et un rapport dans
`lexicon/generated/three-letter-wiktionary-definitions-report.json`.

Pour travailler à plus grande échelle sans appeler l'API mot par mot, télécharger puis extraire le
dump officiel Wiktionnaire localement :

```bash
npm run lexicon:download:wiktionary
npm run lexicon:extract:wiktionary
```

Le dump reste dans `lexicon/sources/`, dossier ignoré par Git. L'extraction produit un fichier
compact `lexicon/generated/wiktionary-definitions.json`, qui peut ensuite servir de source de
préremplissage pour les prochaines vagues d'explications.

Extraction locale du dump du 4 août 2026 :

- pages Wiktionnaire parcourues : 7 734 547 ;
- mots du lexique actif ciblés : 369 539 ;
- définitions uniques extraites : 360 274 ;
- couverture Wiktionnaire du lexique actif : 97,49 % ;
- fichier compact généré : `lexicon/generated/wiktionary-definitions.json`.

Construire la file de priorité pour les prochaines fiches :

```bash
npm run lexicon:prioritize:explanations
```

Cette commande produit :

- `lexicon/reviews/word-explanations-priority.tsv` : 500 mots acceptés sans fiche, classés pour revue ;
- `lexicon/reviews/word-explanations-priority-report.json` : résumé des critères et volumes.

La priorité combine longueur du mot, fréquence Lexique, valeur des lettres, présence de lettres rares, disponibilité de métadonnées ouvertes et utilité des pluriels ou formes fléchies.

Comparer avec une source ODS 8 locale sans l'intégrer au dictionnaire :

```bash
npm run lexicon:compare:ods8
```

Analyser les mots Sérénimot absents d'ODS 8 et proposer des règles d'exclusion :

```bash
npm run lexicon:analyze:ods8-exclusions
```

Générer les exclusions automatiques prudentes à partir de l'analyse :

```bash
npm run lexicon:build:auto-exclusions
```

Analyser plus finement les mots en revue prioritaire :

```bash
npm run lexicon:analyze:ods8-priority-review
```

Analyser la vague GO2 des mots Sérénimot absents d'ODS 8 avec Lefff :

```bash
npm run lexicon:analyze:ods8-go2-review
```

Analyser la vague GO3 des mots ODS 8 absents de Sérénimot mais couverts par Morphalou :

```bash
npm run lexicon:analyze:ods8-go3-enrichment
```

Cartographier les mots ODS 8 encore absents après les enrichissements :

```bash
npm run lexicon:analyze:ods8-go4-missing
```

Analyser les formes jouables générables par règles depuis des lemmes déjà acceptés :

```bash
npm run lexicon:analyze:ods8-go5-rules
```

Filtrer les formes dérivées en revue avec ODS 8, sans intégrer ODS au dictionnaire :

```bash
npm run lexicon:filter:ods8-derived-review
```

Construire une référence Morphalou locale, sans l'intégrer au lexique jouable :

```bash
npm run lexicon:build:morphalou
```

Générer les formes dérivées Morphalou sûres, limitées aux lemmes déjà présents dans Sérénimot :

```bash
npm run lexicon:derive:morphalou
```

Reconstruire ensuite le dictionnaire jouable avec ces formes dérivées :

```bash
npm run lexicon:build:with-derived
```

Reconstruire avec les formes dérivées sûres et les formes de revue confirmées par ODS 8 :

```bash
npm run lexicon:build:with-derived-and-ods8-review
```

Reconstruire avec ces formes plus les impératifs confirmés par ODS 8 :

```bash
npm run lexicon:build:with-derived-ods8-review-and-imperatives
```

Reconstruire le lexique complet courant avec exclusions prudentes :

```bash
npm run lexicon:build:full
```

Comparer le lexique jouable avec cette référence Morphalou générée :

```bash
npm run lexicon:compare:morphalou
```

Construire une référence Lefff locale, puis mesurer ce que Lefff pourrait apporter :

```bash
npm run lexicon:build:lefff
npm run lexicon:analyze:lefff-enrichment
```

Extraire les formes Lefff de haute confiance, confirmées aussi par Morphalou et ODS 8 local :

```bash
npm run lexicon:build:lefff-high-confidence
```

Une commande ODS 9 existe aussi pour plus tard :

```bash
npm run lexicon:compare:ods9
```

Les anciens alias `dictionary:*` restent disponibles, mais les commandes `lexicon:*` sont préférées.
