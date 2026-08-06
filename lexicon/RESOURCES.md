# Ressources lexicales de travail

Ce fichier distingue les ressources utilisables pour construire, comparer ou guider le lexique de Sérénimot.

## Ressources intégrables

### [Lexique 3.83](https://www.lexique.org/)

Rôle actuel : source principale du dictionnaire jouable.

Dernière version publique connue : Lexique 4.00. Elle reste à évaluer avant une migration du pipeline Sérénimot.

Usage :

- construire `public/static/dictionary/lexique383.txt` ;
- conserver les métadonnées utiles au filtrage ;
- tracer les catégories grammaticales, fréquences, lemmes et informations morphologiques.

Point de vigilance : respecter les obligations de la licence annoncée par Lexique/OpenLexicon.

### [Morphalou 3.1](https://www.ortolang.fr/market/lexicons/morphalou)

Rôle actuel : référence de comparaison ouverte, pas source directe du dictionnaire jouable.

Usage :

- vérifier si un mot Sérénimot absent d'ODS est attesté dans une autre ressource structurée ;
- repérer les catégories grammaticales et formes flexionnelles ;
- enrichir le dictionnaire avec des formes dérivées seulement lorsque le lemme est déjà présent dans Sérénimot ;
- améliorer les règles d'exclusion sans copier une liste propriétaire.

Commande :

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

### [LGLex-Lefff 3.4](https://huggingface.co/datasets/datasets-CNRS/lglex-lefff-3.4)

Rôle actuel : référence locale optionnelle pour compléter l'analyse des formes fléchies.

Usage :

- mesurer les formes fléchies absentes de Sérénimot ;
- repérer les mots ODS 8 absents de Sérénimot mais couverts par une ressource ouverte ;
- croiser Lefff avec Morphalou avant toute intégration ;
- conserver une trace des candidats par niveau de confiance.

Commande :

```bash
npm run lexicon:build:lefff
npm run lexicon:analyze:lefff-enrichment
npm run lexicon:build:lefff-high-confidence
```

Le fichier brut doit rester dans `lexicon/sources/`, par exemple `lexicon/sources/lefff-3.4.mlex`. La copie locale utilisée ici provient du paquet `node-lefff@0.3.1` et embarque une licence LGPL-LR pour le fichier Lefff.

La première intégration autorisée par Lefff est volontairement stricte : seules les formes absentes de Sérénimot mais présentes dans Lefff, Morphalou et ODS 8 local sont extraites dans `lexicon/generated/lefff-high-confidence-accepted.txt`. ODS 8 reste un filtre de compatibilité local, pas une source distribuée.

## Ressources de comparaison locale

### ODS 8

Rôle actuel : compatibilité locale seulement.

Usage :

- mesurer les mots Sérénimot absents d'une référence proche du Scrabble francophone ;
- guider les exclusions prudentes ;
- ne jamais insérer automatiquement ODS dans le dictionnaire public.

Commande :

```bash
npm run lexicon:compare:ods8
npm run lexicon:analyze:ods8-exclusions
npm run lexicon:filter:ods8-derived-review
npm run lexicon:analyze:ods8-go2-review
npm run lexicon:analyze:ods8-go3-enrichment
npm run lexicon:analyze:ods8-go4-missing
npm run lexicon:analyze:ods8-go5-rules
```

La vague GO2 filtre des mots Sérénimot absents d'ODS 8 avec les métadonnées Lefff. Les exclusions appliquées ciblent les noms propres détectés par Lefff, quelques noms propres probables, des fragments grammaticaux et des préfixes/formes étrangères non attestés dans les références ouvertes.

La vague GO3 enrichit le lexique avec des mots présents dans Morphalou et confirmés par ODS 8 local, tout en bloquant les mots que Lefff signale comme noms propres ou non lexicaux. Morphalou reste la source ouverte intégrable ; ODS 8 sert uniquement de filtre de compatibilité.

La vague GO4 ne modifie pas le dictionnaire. Elle cartographie les mots ODS 8 encore absents par longueur, familles de suffixes, présence dans les sources ouvertes et limite de plateau. Elle sert à décider si GO5 doit générer certaines formes par règles ou accepter que certains mots restent hors périmètre.

La vague GO5 ajoute uniquement des formes générées par règles simples depuis des verbes déjà acceptés dans Sérénimot. ODS 8 sert de filtre local de compatibilité pour savoir quelles formes générées sont pertinentes, mais la forme est produite par la règle et rattachée à un lemme existant.

Pour le lexique actif `4.00.1-preview`, la commande `npm run lexicon:build:active-preview-metadata` fusionne les métadonnées Lexique 4.00 et 3.83, puis couvre 368 956 mots actifs sur 368 956. Avec ces métadonnées, `npm run lexicon:analyze:ods8-go5-rules-active` génère actuellement 368 formes régulières `-ER` rattachées à des lemmes verbaux déjà acceptés. La revue `npm run lexicon:review:ods8-go5-rules-active` ne bloque aucune forme automatiquement, accepte strictement 292 formes et accepte 76 formes avec note : 60 subjonctifs imparfaits et 16 doubles lectures grammaticales normales. Le candidat non activé `npm run lexicon:build:lexique400-preview-go5-candidate` monte à 369 324 mots et couvre 85,18 % d'ODS 8 localement, sans augmenter les mots Sérénimot absents d'ODS.

## Ressources de règles

### Critères FISF

Rôle : inspiration pour formuler des règles proches du Scrabble francophone sans copier un dictionnaire propriétaire.

Usage utile :

- clarifier l'acceptation des flexions ;
- traiter les formes courtes ;
- décider des limites sur sigles, abréviations et symboles.

### Wiktionnaire

Rôle : ressource ouverte complémentaire pour qualifier certains mots.

Usage utile :

- détecter les sigles et acronymes via catégories dédiées ;
- récupérer éventuellement classe grammaticale et définitions avec une attribution claire ;
- ne pas mélanger automatiquement sans revue, car le bruit lexical peut être important.

## Ordre de décision recommandé

1. Le mot est-il dans ODS 8 localement ? Le garder en priorité.
2. Sinon, est-il attesté dans Morphalou et Lexique avec une classe grammaticale courante ? Le garder comme candidat.
3. Sinon, est-il court, rare, abréviatif, interjectif ou issu d'un nom propre ? Le mettre en revue.
4. Exclure automatiquement seulement les familles très sûres : symboles, sigles probables, formes non alphabétiques, locutions, mots trop longs.
