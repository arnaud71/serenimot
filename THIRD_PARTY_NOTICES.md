# Notices de tiers

Ce fichier documente les ressources tierces utilisees par Serenimot, en particulier pour la
construction du lexique jouable.

La licence generale du code de l'application est definie separement dans `LICENSE`. La licence
ci-dessous concerne le lexique jouable distribue avec l'application.

## Avertissement

Serenimot est un projet independant. Il n'est pas affilie a Scrabble, Mattel, Hasbro, Larousse,
la FISF ou une federation de jeu de lettres. Les ressources lexicales documentees ici ne
constituent pas un dictionnaire officiel de competition.

## Lexique Serenimot

Version actuelle : Lexique Serenimot 4.00.5.

Fichier redistribue dans l'application :

- `public/static/dictionary/lexique4005.txt`
- `public/static/dictionary/lexique4005.explanations.json`

Licence du lexique Serenimot :

- Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- https://creativecommons.org/licenses/by-sa/4.0/

Le lexique Serenimot est derive notamment de Lexique 4.00, puis enrichi et filtre par des
traitements propres au projet Serenimot. La convention de version est documentee dans
`docs/dictionary-sources.md`.

## Lexique 4.00

Role : source principale du lexique jouable actuel.

Attribution :

- Lexique 4.00
- Boris New et Christophe Pallier
- https://www.lexique.org/

Fichier source utilise localement :

- https://www.lexique.org/databases/Lexique400/Lexique400.tsv

Licence annoncee par Lexique/OpenLexicon :

- Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- https://creativecommons.org/licenses/by-sa/4.0/

Note : Lexique 3.83 reste documente comme source historique et comparative du projet.

## Wiktionnaire

Role : source ouverte complementaire pour pre-remplir certaines explications de mots.

Source :

- Wiktionnaire en francais
- https://fr.wiktionary.org/
- API MediaWiki : https://fr.wiktionary.org/w/api.php

Licence indiquee :

- Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- https://creativecommons.org/licenses/by-sa/4.0/

Statut dans Serenimot :

- les definitions recuperees sont conservees dans un cache genere localement ;
- elles servent a pre-remplir des fiches marquees `reviewed=false` ;
- une fiche issue de Wiktionnaire doit rester a relire avant validation definitive.

## Morphalou 3.1

Role : ressource ouverte de travail pour l'analyse et l'enrichissement prudent des formes
flechees.

Source :

- Morphalou 3.1
- ATILF / ORTOLANG
- https://www.ortolang.fr/market/lexicons/morphalou
- Citation persistante indiquee par ORTOLANG : https://hdl.handle.net/11403/morphalou/v3.1

Licence indiquee :

- LGPL-LR, Lesser General Public License For Linguistic Resources

Statut dans Serenimot :

- le fichier brut Morphalou reste dans `lexicon/sources/`, dossier ignore par Git ;
- les traitements locaux peuvent produire des candidats et des rapports ;
- les formes integrees au lexique jouable doivent rester tracables dans les rapports de generation.

## LGLex-Lefff 3.4 / Lefff

Role : ressource morphologique de travail pour croiser les formes, reperer les formes flechees et
aider a identifier certains noms propres ou formes non lexicales.

Sources :

- LGLex-Lefff 3.4
- https://huggingface.co/datasets/datasets-CNRS/lglex-lefff-3.4
- Page historique Lefff / Alexina : https://almanach.inria.fr/software_and_resources/Alexina-fr.html

Copie locale utilisee dans le pipeline courant :

- paquet npm `node-lefff@0.3.1`
- fichier local attendu : `lexicon/sources/lefff-3.4.mlex`

Licence indiquee :

- LGPL-LR, Lesser General Public License For Linguistic Resources

Statut dans Serenimot :

- le fichier brut Lefff reste dans `lexicon/sources/`, dossier ignore par Git ;
- Lefff sert aux analyses locales et aux enrichissements de haute confiance ;
- les formes integrees au lexique jouable doivent rester tracables dans les rapports de generation.

## ODS 8 local

Role : reference locale de comparaison de compatibilite.

Statut dans Serenimot :

- ODS 8 n'est pas redistribue dans ce depot ;
- ODS 8 n'est pas propose au telechargement par Serenimot ;
- ODS 8 ne doit pas etre insere directement comme source dans le lexique public ;
- le fichier local attendu, lorsque l'utilisateur le fournit legalement, est `lexicon/sources/ods8.txt`,
  dans un dossier ignore par Git.

Les scripts peuvent utiliser cette reference pour produire des rapports de compatibilite et guider
des filtres prudents, sans copier la source ODS dans le dictionnaire public.

## Dependances logicielles

Les dependances JavaScript utilisees pour le developpement et la construction de l'application sont
listees dans `package.json` et `package-lock.json`.

Avant toute distribution publique, verifier les licences effectives des dependances avec une
commande d'audit de licences adaptee au mode de publication choisi.
