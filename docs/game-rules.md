# Règles du prototype

## Plateau

Le plateau comporte 13 x 13 cases. La disposition des bonus est originale :

- `Lx2` double la valeur d'une lettre posée pendant le tour.
- `Lx3` triple la valeur d'une lettre posée pendant le tour.
- `Mx2` double le score du mot si une nouvelle lettre est posée dessus.
- `Mx3` triple le score du mot si une nouvelle lettre est posée dessus.
- `+1` ajoute un point de Sérénité à la lettre et identifie aussi la case centrale.

Les bonus restent volontairement peu nombreux pour laisser respirer la grille. Les cases `Mx3` sont limitées aux coins du plateau. Les cases `Lx3` sont placées près des coins, mais pas au centre. Les cases `Mx2` et `Lx2` servent de récompenses intermédiaires : elles sont plus accessibles que les triples, mais assez rares pour conserver une vraie valeur stratégique.

## Chevalet

Chaque joueur reçoit 8 lettres. La pioche est mélangée au début d'une nouvelle partie.

## Préparation et placement

Le joueur peut préparer un mot en touchant plusieurs lettres du chevalet, choisir le sens horizontal ou vertical, puis toucher la case de départ sur le plateau. Le mot entier est posé en une seule action si toutes les cases sont disponibles.

Si le mot préparé traverse une lettre déjà posée et que cette lettre correspond, la case existante est utilisée comme repère et la tuile préparée correspondante reste dans le chevalet.

Le joueur peut aussi toucher une lettre déjà validée sur le plateau pour l'ajouter au mot préparé. Cette lettre sert de repère, n'est pas consommée dans le chevalet et peut être retirée avec `Retirer` ou `Effacer`.

Le premier mot doit passer par la case centrale. Les lettres posées pendant le tour doivent rester sur une même ligne ou une même colonne. Le mot principal doit être continu, sans case vide entre les lettres posées ou déjà présentes.

Le joueur peut reprendre son coup avant validation.

## Validation

Le prototype valide le mot principal du tour avec un dictionnaire local généré depuis Lexique 3.83. Les trous dans le mot principal sont refusés.

Chaque nouvelle lettre est aussi vérifiée dans le sens perpendiculaire. Si elle forme un mot croisé de deux lettres ou plus, ce mot doit également être reconnu par le dictionnaire actuel. Si un mot croisé n'est pas reconnu, tout le coup est refusé.

Les mots de 2 à 4 lettres suivent une politique lexicale plus stricte que les mots longs, car ils influencent fortement le plateau. Les sigles, abréviations, symboles d'unités et formes non lexicales ne sont pas acceptés par défaut. La politique détaillée du pipeline est documentée dans `lexicon/SHORT_WORD_POLICY.md`.

## Score

Le score additionne le mot principal et les mots croisés secondaires formés pendant le tour. Les lettres déjà présentes comptent avec leur valeur simple. Les bonus `Lx2`, `Lx3`, `Mx2`, `Mx3` et `+1` s'appliquent aux nouvelles lettres du tour. Un bonus de 12 points est prévu si les 8 lettres du chevalet sont jouées dans le même tour.

## Adversaire

L'adversaire facile joue localement. Il cherche un mot court du dictionnaire actuel qui peut se connecter à une lettre déjà posée, puis place les nouvelles lettres sur le plateau. S'il ne trouve pas de coup simple, il passe son tour.

## Indice

Le bouton `Indice` propose le meilleur mot trouvé localement avec le chevalet actuel et le dictionnaire actuel. Il indique le mot, le sens, la ligne, la colonne et le score estimé.

Lorsque l'indice est affiché, les lettres nécessaires sont préparées dans le chevalet et le joueur peut utiliser le bouton `Valider` pour jouer cette proposition.
