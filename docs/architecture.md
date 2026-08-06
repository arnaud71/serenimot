# Architecture

Sérénimot sépare le moteur du jeu de l'interface.

## Modules

- `src/domain/board` crée le plateau 13 x 13 et les bonus originaux.
- `src/domain/tiles` définit les tuiles, la pioche et les types partagés.
- `src/domain/rules` valide les coups, la continuité du mot principal, les mots croisés secondaires et le dictionnaire local généré.
- `src/domain/scoring` calcule le score du coup à partir de tous les mots formés.
- `src/domain/turns` orchestre la création de partie, le placement, l'annulation, la validation et l'adversaire facile.
- `src/domain/turns/hints.ts` cherche localement les meilleurs coups possibles pour le bouton Indice.
- `src/components/game` affiche le plateau, le chevalet et les actions.
- `src/features/persistence` sauvegarde la partie dans IndexedDB.
- `src/features/accessibility` stocke les préférences futures sans modifier le moteur.

## Flux de données

React possède l'état courant de `GameState`. Les actions de l'utilisateur appellent des fonctions pures ou presque pures du domaine, puis remplacent l'état complet. La sauvegarde automatique persiste cet état en IndexedDB avec un numéro de schéma.

## Stockage

La sauvegarde courante est stockée dans la base IndexedDB `serenimot`, magasin `saved-games`, clé `current`.

La structure est versionnée :

```ts
type SavedGame = {
  schemaVersion: number;
  savedAt: string;
  gameId: string;
  state: GameState;
};
```

## Adversaire

L'adversaire facile est local et volontairement limité. Il ne connaît pas les lettres du joueur. Il parcourt les mots courts du dictionnaire local, cherche une lettre d'ancrage déjà posée sur le plateau, vérifie que les lettres manquantes sont dans son chevalet, puis valide le coup avec le même moteur que le joueur.
