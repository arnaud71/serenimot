# Interactions de jeu

Ce document décrit les gestes principaux de Sérénimot et montre leur rendu sur ordinateur et sur smartphone.

Les captures ont été produites depuis l'application locale avec une partie déterministe. Elles servent de référence visuelle pour vérifier que les interactions restent cohérentes au fil des évolutions.

## Vue générale

Sur ordinateur, le plateau occupe la zone principale et la préparation du coup reste visible à droite.

![Vue générale ordinateur](assets/interactions/01-desktop-game-overview.png)

Sur smartphone, le plateau reste prioritaire. La zone de préparation et les actions rapides restent accessibles sous le plateau.

![Vue générale smartphone](assets/interactions/10-mobile-game-overview.png)

Le même geste de pose fonctionne sur téléphone : une case est choisie, puis une lettre est touchée.

![Lettre posée sur smartphone](assets/interactions/11-mobile-letter-placed.png)

## Poser une lettre sur le plateau

Le placement tactile et souris suit le même principe :

1. choisir une case vide du plateau ;
2. toucher ou cliquer une lettre disponible ;
3. la lettre est posée sur la case choisie.

La case vide sélectionnée est visuellement marquée.

![Case vide sélectionnée](assets/interactions/02-board-empty-cell-selected.png)

Après le choix d'une lettre, elle apparaît sur le plateau. Le coup peut encore être modifié avant validation.

![Lettre posée depuis la réserve](assets/interactions/03-board-letter-placed-from-rack.png)

## Déplacer une lettre déjà posée

Une lettre posée pendant le tour peut être déplacée sans utiliser le glisser-déposer.

1. sélectionner une nouvelle case vide ;
2. toucher ou cliquer la lettre déjà posée ;
3. la lettre est déplacée vers la case sélectionnée.

Deux lettres sont ici déjà posées pendant le tour.

![Deux lettres posées avant déplacement](assets/interactions/04-two-board-letters-before-move.png)

La nouvelle case de destination est sélectionnée.

![Destination sélectionnée avant déplacement](assets/interactions/05-board-destination-selected-before-moving-letter.png)

La lettre cliquée est déplacée vers cette destination. Les autres lettres du coup restent en place.

![Lettre déplacée vers la case sélectionnée](assets/interactions/06-board-letter-moved-to-selected-cell.png)

Sans case destination sélectionnée, un clic sur une lettre posée pendant le tour retire uniquement cette lettre du plateau.

## Utiliser le chevalet

Le chevalet permet de préparer un mot avant de le poser en une seule action sur le plateau. Il reste aussi possible de poser les lettres une par une.

![Zone de préparation ordinateur](assets/interactions/07-preparation-zone-desktop.png)

Un mot peut être préparé depuis les lettres disponibles.

![Mot préparé dans le chevalet](assets/interactions/08-prepared-word-in-rack.png)

En touchant ou cliquant une case compatible, le mot préparé est posé sur le plateau.

![Mot préparé posé sur le plateau](assets/interactions/09-prepared-word-placed-on-board.png)

## Déplacer dans le chevalet

Le chevalet accepte deux modes complémentaires :

- glisser-déposer une lettre vers un autre emplacement ;
- sélectionner un emplacement vide, puis toucher une lettre du chevalet pour la déplacer vers cet emplacement.

Ces deux modes permettent d'organiser le mot sans dépendre d'un geste précis.

## Échanger des lettres

Le bouton `Échanger` permet de remplacer des lettres au lieu de poser un mot.

1. appuyer sur `Échanger` ;
2. si des lettres sont déjà posées pendant le tour ou préparées dans le chevalet, elles reviennent dans `Vos lettres` ;
3. toucher les lettres à remplacer dans `Vos lettres` ;
4. appuyer à nouveau sur `Échanger`.

Les lettres choisies retournent dans la pioche, le joueur reçoit le même nombre de nouvelles lettres et le tour est passé. Pendant la sélection, `Indice` et `Passer` restent visibles mais ne sont pas cliquables. Le bouton `Annuler` permet de quitter le mode échange avant confirmation.

Après l'échange, le jeu applique la même vérification qu'après `Passer` : si aucun nouveau mot ne peut être créé par les deux joueurs, la partie se termine. Si la pioche ne contient pas assez de lettres pour l'échange demandé, le joueur doit poser un mot ou passer son tour.

## Actions rapides mobiles

Sur smartphone, les actions principales sont regroupées dans une barre rapide :

- Valider ;
- Indice ;
- Passer ;
- Échanger ;
- Reprendre ;
- Effacer.

![Actions rapides smartphone](assets/interactions/12-mobile-quick-actions.png)

La zone de préparation mobile conserve les mêmes fonctions que sur ordinateur, avec des cibles plus adaptées au toucher.

![Zone de préparation smartphone](assets/interactions/13-mobile-preparation-zone.png)

## Synthèse des gestes

| Situation | Geste | Résultat |
| --- | --- | --- |
| Case vide du plateau | Cliquer ou toucher | La case devient la destination sélectionnée. |
| Case sélectionnée + lettre disponible | Cliquer ou toucher la lettre | La lettre est posée sur la case sélectionnée. |
| Case sélectionnée + lettre déjà posée ce tour | Cliquer ou toucher la lettre | La lettre est déplacée vers la case sélectionnée. |
| Lettre déjà posée ce tour, sans case sélectionnée | Cliquer ou toucher | Seule cette lettre est retirée du plateau. |
| Lettre du chevalet | Glisser vers le plateau | La lettre est posée sur la case visée. |
| Lettre déjà posée sur le plateau | Glisser vers une case vide | La lettre est déplacée vers cette case. |
| Emplacement vide du chevalet | Cliquer ou toucher | L'emplacement devient la destination sélectionnée. |
| Emplacement du chevalet sélectionné + lettre | Cliquer ou toucher la lettre | La lettre se déplace vers l'emplacement sélectionné. |
| Bouton Échanger | Cliquer ou toucher | Les lettres du coup en cours reviennent dans Vos lettres, puis la sélection d'échange s'active. |
| Mode échange + lettres dans Vos lettres | Cliquer ou toucher les lettres | Les lettres sont sélectionnées ou retirées de la sélection d'échange. |
| Mode échange + bouton Échanger | Cliquer ou toucher | Les lettres choisies sont remplacées et le tour est passé. |
| Mode échange + bouton Annuler | Cliquer ou toucher | La sélection d'échange est abandonnée sans remplacer de lettre. |

## Points de cohérence à préserver

- Le glisser-déposer ne doit jamais être la seule méthode disponible.
- Un clic sur une lettre posée ne doit jamais retirer tout le mot.
- La sélection d'une destination doit être visible.
- Le mode échange doit toujours annoncer qu'il passe le tour et qu'il peut être annulé avant confirmation.
- Les actions mobiles ne doivent pas créer de doublons accessibles avec les actions ordinateur.
- Les règles de placement doivent rester identiques entre ordinateur, tablette et smartphone.
