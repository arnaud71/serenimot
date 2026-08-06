# Compatibilité ODS

Sérénimot peut comparer son lexique avec une source ODS locale, mais ne doit pas télécharger ni redistribuer automatiquement une liste ODS non licenciée.

## ODS 8

La source locale attendue est :

```text
lexicon/sources/ods8.txt
```

Ce fichier doit rester hors Git. Le dossier `lexicon/sources/` est ignoré.

Une fois le fichier présent, lancer :

```bash
npm run lexicon:compare:ods8
```

Pour filtrer les formes dérivées Morphalou mises en revue avec cette même source locale :

```bash
npm run lexicon:filter:ods8-derived-review
```

Le rapport est généré dans :

```text
lexicon/generated/ods8-compatibility-report.json
```

Le filtre des dérivés génère :

```text
lexicon/generated/ods8-derived-review-report.json
lexicon/generated/ods8-derived-accepted-candidates.txt
lexicon/generated/ods8-derived-rejected-candidates.tsv
```

## Règle de prudence

Même si une liste ODS 8 circule publiquement sur Internet, elle ne doit pas être ajoutée au dépôt ni au dictionnaire public de Sérénimot sans licence explicite compatible.

Le pipeline ODS sert uniquement à produire des rapports de compatibilité locaux pour guider les filtres du lexique Sérénimot.
