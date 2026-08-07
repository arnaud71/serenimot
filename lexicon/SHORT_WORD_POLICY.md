# Politique des mots courts

Cette politique concerne les mots de 2 a 4 lettres du lexique Serenimot, en particulier ceux qui restent absents de la comparaison locale ODS 8.

Elle ne modifie pas le dictionnaire actif. Elle sert a transformer les revues automatiques en decisions produit stables, documentees et rejouables.

## Pourquoi une politique speciale

Les mots courts ont un effet disproportionne dans un jeu de lettres :

- ils ouvrent beaucoup de placements ;
- ils facilitent les mots croises secondaires ;
- ils peuvent rendre le jeu moins comprehensible si des sigles, abreviations ou fragments sont acceptes ;
- ils sont souvent les premiers mots contestes par les joueurs.

Sérénimot ne cherche pas a copier strictement ODS, mais il doit eviter un lexique trop permissif sur les tres petits mots.

## Principes

1. Un mot court doit etre lexicalement explicable.
2. Les sigles, abreviations techniques et symboles d'unites ne sont pas acceptes par defaut.
3. Les mots deja presents dans le lexique Serenimot courant ne sont pas retires automatiquement.
4. Une confirmation par deux sources ouvertes augmente la confiance, mais ne remplace pas la decision produit.
5. Les onomatopees et interjections doivent etre decidees explicitement, car elles changent fortement le ton du jeu.
6. Une référence ODS non integree et non distribuee peut servir de garde-fou de compatibilite, sans etre redistribuee ni integree directement.

## Decisions de reference

| Decision | Politique | Action candidate |
| --- | --- | --- |
| `exclude-short-sigle-or-abbreviation` | Sigle, abreviation, categorie non lexicale, unite ou mot sans voyelle probable. | Exclure du candidat. |
| `keep-existing-cross-sourced` | Mot deja present dans Serenimot et confirme par Morphalou ou Lefff. | Garder, sauf contestation humaine. |
| `review-keep-cross-source` | Mot absent d'ODS 8 mais present dans Morphalou et Lefff avec frequence non nulle. | Garder provisoirement, revue possible avant publication. |
| `review-rare-cross-source` | Mot present dans Morphalou et Lefff mais tres rare. | Revue humaine avant publication. |
| `review-keep-common-morphalou` | Mot present dans Morphalou avec frequence confortable, mais sans Lefff ni ODS 8. | Garder provisoirement si le mot est explicable. |
| `review-rare-morphalou` | Mot present dans Morphalou seulement, souvent rare. | Revue humaine prioritaire. |
| `review-rare-inflected-form` | Forme verbale courte rare. | Revue humaine, puis traiter via les regles de conjugaison. |
| `review-expressive-word` | Interjection ou onomatopee potentielle. | Decision produit explicite. |
| `review-foreign-or-borrowed` | Emprunt, mot anglais ou terme international probable. | Garder seulement si l'usage francais est clair. |

## Regles proposees pour les candidats 4.00.x

### Exclure

Exclure les mots courts nouveaux issus de Lexique 4.00 lorsque l'un des signaux suivants est present :

- aucune voyelle `A E I O U Y` ;
- categorie `ADJ:num` ou usage assimilable a un symbole d'unite ;
- categorie `non-lexical`, sauf si le mot est classe comme onomatopee ou interjection ;
- tres faible frequence, absence de Lefff, et forme courte de 2 ou 3 lettres.

Ces regles correspondent a la sortie :

```text
lexicon/generated/lexique400-short-word-suggested-exclusions.txt
```

### Garder provisoirement

Garder provisoirement :

- les mots deja presents dans le lexique Serenimot courant et croises avec Morphalou ou Lefff ;
- les mots confirmes par Morphalou et Lefff avec une frequence non nulle ;
- les mots Morphalou frequents lorsque leur explication est claire.

Ces mots restent absents de la référence ODS 8, donc ils doivent etre visibles dans le rapport de qualite du lexique.

### Revoir humainement

Revoir avant publication :

- les mots presents seulement dans Morphalou et rares ;
- les formes verbales courtes rares ;
- les mots techniques, emprunts, mots anglais ou internationalismes ;
- les onomatopees et interjections.

## Etat local historique

Apres deux vagues candidates :

- 127 exclusions de mots courts ont ete appliquees au candidat bis ;
- 213 mots courts restent absents de la référence ODS 8 ;
- repartition : 10 mots de 2 lettres, 40 mots de 3 lettres, 163 mots de 4 lettres.

Classement de revue :

- `review-rare-morphalou` : 100 mots ;
- `review-rare-cross-source` : 35 mots ;
- `review-keep-cross-source` : 30 mots ;
- `keep-existing-cross-sourced` : 23 mots ;
- `review-rare-inflected-form` : 13 mots ;
- `review-keep-common-morphalou` : 10 mots ;
- `review-foreign-or-borrowed` : 1 mot ;
- `review-expressive-word` : 1 mot.

## Revue active GO A

La revue GO A part du lexique actif `4.00.3`, examine les petits mots ODS 8 absents sans les integrer directement, puis active uniquement `TIPA` en version `4.00.4`.

Resultat :

- 216 petits mots revus ;
- 1 mot accepte : `TIPA`, forme courte rattachee par regle au lemme verbal deja accepte `TIPER` ;
- 187 mots gardes en attente, dont 186 uniquement visibles via la comparaison avec la référence ODS 8 ;
- 1 mot ouvert mais non tranche : `DIAM`, present dans Morphalou mais encore sans explication validee ;
- 28 mots rejetes comme noms propres ou assimiles ;
- version active obtenue : `4.00.4`, 369 538 mots.

La regle de decision reste volontairement stricte : un petit mot uniquement present dans la référence ODS 8 ne suffit pas. Il faut une source ouverte redistribuable ou une generation par regle rattachee a un lemme deja accepte.

## Revue manuelle GO B

GO B tranche le cas `DIAM`, laisse en attente par GO A.

Resultat :

- 1 mot accepte : `DIAM` ;
- version active obtenue : `4.00.5`, 369 539 mots ;
- 214 petits mots restent suivis par la revue active ;
- 0 nouveau mot court est automatiquement acceptable ;
- 186 mots courts restent gardes en attente ;
- 28 mots restent rejetes comme noms propres ou assimiles.

Justification :

- `DIAM` est present dans Lexique 3.83 comme nom masculin singulier ;
- `DIAM` est present dans Lexique 4.00 comme nom masculin singulier, rattache morphologiquement a `diamant` ;
- `DIAM` est present dans Morphalou ;
- `DIAMS` etait deja actif dans Serenimot, donc accepter le pluriel sans le singulier etait incoherent ;
- La référence ODS 8 confirme la compatibilite, sans etre integree ni redistribuee.

## Commandes associees

```bash
npm run lexicon:review:lexique400-short-words
npm run lexicon:build:lexique400-short-word-suggested-exclusions
npm run lexicon:build:lexique400-candidate-filtered-short
npm run lexicon:compare:lexique400-candidate-filtered-short:ods8
npm run lexicon:review:lexique400-remaining-short-words
npm run lexicon:review:active-short-words
npm run lexicon:build:active-short-words-candidate
npm run lexicon:compare:active-short-words-candidate:ods8
```

## Regle pour l'interface

Lorsqu'un petit mot est accepte mais rare, le jeu devrait pouvoir afficher une explication courte ou une classe grammaticale. Cette aide est plus importante pour les mots courts que pour les mots longs, car les mots courts semblent souvent arbitraires aux joueurs.
