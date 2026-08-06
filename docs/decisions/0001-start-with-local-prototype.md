# 0001 - Commencer par un prototype local

## Décision

La première version de Sérénimot est une application React/TypeScript/Vite sans backend.

## Raisons

- Valider rapidement la boucle de jeu.
- Respecter l'absence de compte obligatoire.
- Garder les données sur l'appareil.
- Reporter le mode Confort complet après observation d'utilisateurs.

## Conséquences

La sauvegarde utilise IndexedDB. L'adversaire et le dictionnaire restent locaux. Les fonctions de synchronisation, compte, cloud ou multijoueur sont hors périmètre initial.
