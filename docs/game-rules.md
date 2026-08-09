# Règles du prototype

## Plateau

Le plateau peut comporter 9 x 9, 11 x 11, 13 x 13, 15 x 15 ou 17 x 17 cases. La disposition des bonus est originale et s'adapte à la taille choisie :

- `Lx2` double la valeur d'une lettre posée pendant le tour.
- `Lx3` triple la valeur d'une lettre posée pendant le tour.
- `Mx2` double le score du mot si une nouvelle lettre est posée dessus.
- `Mx3` triple le score du mot si une nouvelle lettre est posée dessus.
- `+1` ajoute un point de Sérénité à la lettre et identifie aussi la case centrale.

Les bonus restent volontairement peu nombreux pour laisser respirer la grille. Les cases `Mx3` sont limitées aux coins du plateau. Les cases `Lx3` sont placées près des coins, mais pas au centre. Les cases `Mx2` et `Lx2` servent de récompenses intermédiaires : elles sont plus accessibles que les triples, mais assez rares pour conserver une vraie valeur stratégique.

## Chevalet

Chaque joueur reçoit 8 lettres. La pioche est mélangée au début d'une nouvelle partie.

Le nombre total de pièces s'adapte à la taille de la grille afin d'éviter les parties trop longues sur les petites grilles ou trop courtes sur les grandes :

- 9 x 9 : 52 pièces.
- 11 x 11 : 77 pièces.
- 13 x 13 : 108 pièces.
- 15 x 15 : 144 pièces.
- 17 x 17 : 185 pièces.

La distribution des lettres garde les mêmes proportions que la grille 13 x 13 : chaque taille de grille
utilise donc un nombre différent de `A`, `E`, `I`, etc. Dans l'application, la section `Règles`
affiche un onglet par taille de grille pour consulter la distribution réellement utilisée.

## Échange de lettres

Le joueur peut remplacer une ou plusieurs lettres disponibles au lieu de poser un mot. Le bouton `Échanger` remet d'abord les lettres posées pendant le tour et les lettres préparées dans `Vos lettres`, puis active une sélection dans `Vos lettres`. Le joueur touche les lettres à remplacer, puis appuie à nouveau sur `Échanger`.

Pendant cette sélection, les boutons `Indice` et `Passer` restent visibles mais ne sont pas cliquables. Le bouton `Annuler` permet de quitter le mode échange sans remplacer de lettre.

Les lettres choisies retournent dans la pioche, le joueur reçoit le même nombre de nouvelles lettres et son tour est passé. L'échange n'est disponible que si la pioche contient au moins autant de lettres que la sélection. Si la pioche ne permet plus l'échange demandé, le joueur doit poser un mot ou passer son tour.

Après un échange, le jeu vérifie la fin de partie comme après un tour passé. Si aucun nouveau mot ne peut être créé par les deux joueurs, la partie se termine.

## Préparation et placement

Le joueur peut poser une lettre en touchant d'abord une case vide du plateau, puis une lettre disponible. Si une suite de lettres est déjà posée pendant le tour, toucher une case vide déplace le début de cette suite sur la case choisie.

Le début du mot reste toujours la référence du déplacement. Toucher une lettre déjà posée pendant le tour déplace le début du mot sur cette lettre : les lettres suivantes gardent leur ordre et avancent dans la direction actuelle. Pour retirer une seule lettre posée pendant le tour, il faut double-cliquer ou double-toucher cette lettre.

Le joueur peut aussi préparer un mot en touchant plusieurs lettres du chevalet, puis toucher une case compatible sur le plateau. Le jeu cherche une pose horizontale ou verticale valide à partir de cette case. Le mot entier est posé en une seule action si les cases sont compatibles et si le coup respecte les règles de validation.

Si le mot préparé traverse une lettre déjà posée et que cette lettre correspond, la case existante est utilisée comme repère et la tuile préparée correspondante reste dans le chevalet.

Le joueur peut aussi toucher une lettre déjà validée sur le plateau pour l'ajouter au mot préparé. Cette lettre sert de repère, n'est pas consommée dans le chevalet et peut être retirée avec `Retirer` ou `Effacer`.

Dans le chevalet, le joueur peut sélectionner un emplacement vide puis toucher une lettre du chevalet pour la déplacer vers cet emplacement. Une lettre peut aussi être glissée sur une autre lettre du chevalet pour l'insérer avant ou après elle. Le glisser-déposer reste disponible, mais n'est pas obligatoire.

Le premier mot doit passer par la case centrale. Les lettres posées pendant le tour doivent rester sur une même ligne ou une même colonne. Le mot principal doit être continu, sans case vide entre les lettres posées ou déjà présentes.

Le joueur peut reprendre son coup avant validation.

## Validation

Le prototype valide le mot principal du tour avec un dictionnaire local généré depuis Lexique 3.83. Les trous dans le mot principal sont refusés.

Chaque nouvelle lettre est aussi vérifiée dans le sens perpendiculaire. Si elle forme un mot croisé de deux lettres ou plus, ce mot doit également être reconnu par le dictionnaire actuel. Si un mot croisé n'est pas reconnu, tout le coup est refusé.

Les mots de 2 à 4 lettres suivent une politique lexicale plus stricte que les mots longs, car ils influencent fortement le plateau. Les sigles, abréviations, symboles d'unités et formes non lexicales ne sont pas acceptés par défaut. La politique détaillée du pipeline est documentée dans `lexicon/SHORT_WORD_POLICY.md`.

## Score

Le score additionne le mot principal et les mots croisés secondaires formés pendant le tour. Les lettres déjà présentes comptent avec leur valeur simple. Les bonus `Lx2`, `Lx3`, `Mx2`, `Mx3` et `+1` s'appliquent aux nouvelles lettres du tour. Un bonus de 12 points est prévu si les 8 lettres du chevalet sont jouées dans le même tour.

## Fin de partie

La partie se termine lorsqu'aucun nouveau mot ne peut être créé par les deux joueurs avec les lettres restantes et le plateau actuel. Elle peut aussi se terminer après plusieurs tours consécutifs passés sans mot posé.

## Adversaire

L'adversaire facile joue localement. Il cherche un mot court du dictionnaire actuel qui peut se connecter à une lettre déjà posée, puis place les nouvelles lettres sur le plateau. S'il ne trouve pas de coup simple, il passe son tour.

## Indice

Le bouton `Indice` propose le meilleur mot trouvé localement avec le chevalet actuel et le dictionnaire actuel. Il indique le mot, le sens, la ligne, la colonne et le score estimé.

Lorsque l'indice est affiché, les lettres nécessaires sont préparées dans le chevalet et le joueur peut utiliser le bouton `Valider` pour jouer cette proposition.

## Anti-confusion

Sérénimot est un jeu original et indépendant de lettres croisées sur grille. Il n'est pas affilié à Scrabble, Mattel, Hasbro, Larousse, la FISF ou une fédération de jeu de lettres.

Le jeu utilise son propre nom, son propre plateau, sa propre disposition de bonus, ses propres règles, son propre système de score et un lexique ouvert documenté. Il ne reprend pas le plateau officiel, les règles officielles ni un dictionnaire officiel de compétition.
