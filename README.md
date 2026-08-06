# Sérénimot

Jeu original de lettres croisées sur grille, installable comme PWA.

Sérénimot est un jeu original de lettres croisées sur grille. Cette première base vise un prototype local simple : commencer une partie, placer des lettres par sélection puis clic ou toucher, annuler son coup, valider des mots avec un dictionnaire local, sauvegarder et reprendre.

Accroche de travail : « Les mots, à votre rythme. »

## Installation développeur

```bash
npm install
npm run dev
```

Pour l'installation sur iPhone, iPad, Android, Mac ou Windows, voir [docs/installation.md](docs/installation.md).

## Commandes

```bash
npm run build
npm run preview
npm run test
npm run test:e2e
npm run test:e2e:pwa
npm run verify
npm run test:watch
npm run typecheck
npm run lint
npm run lexicon:build
```

Voir [docs/testing.md](docs/testing.md) pour la separation entre les tests d'interface, les tests PWA hors ligne et la commande globale `verify`.

## Licence

Le code de l'application est distribué sous licence MIT. Les ressources lexicales et définitions redistribuées conservent leurs licences propres, documentées dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) et [docs/dictionary-sources.md](docs/dictionary-sources.md).

## Avertissement

Sérénimot est un projet indépendant. Il n'est pas affilié à Scrabble, Mattel, Hasbro, Larousse, la FISF ou une fédération de jeu de lettres. Le lexique inclus est une ressource ouverte adaptée au projet ; il ne constitue pas un dictionnaire officiel de compétition.

## État du prototype

- Plateau original 13 x 13.
- Chevalet de 8 lettres.
- Préparation d'un mot depuis le chevalet, puis pose en une seule action sur le plateau.
- Placement d'une lettre seule encore possible côté moteur.
- Validation du mot principal sans trou entre les lettres.
- Pose possible à travers une lettre déjà présente si elle correspond au mot préparé.
- Possibilité d'ajouter une lettre déjà posée sur le plateau dans le mot préparé comme repère.
- Détection, validation et score des mots croisés secondaires.
- Bouton Indice proposant le meilleur mot trouvé avec le dictionnaire local et le préparant pour validation.
- Annulation du coup en cours.
- Validation avec un dictionnaire local généré depuis Lexique 3.83.
- Score simple et original.
- Adversaire local facile qui pose un mot court lorsqu'il trouve une connexion simple.
- Sauvegarde automatique locale avec IndexedDB.
- Manifeste PWA et service worker de base.
- Préférences extensibles pour texte et contraste.

## Structure

- `src/domain/` contient le moteur pur du jeu.
- `src/components/` contient l'interface React.
- `src/features/persistence/` contient la sauvegarde locale.
- `src/features/accessibility/` contient les préférences extensibles.
- `docs/` documente les règles, l'accessibilité, le dictionnaire et l'architecture.

## Limites connues

Le dictionnaire est beaucoup plus large que la première liste de démonstration, mais ses règles lexicales doivent encore être affinées avant une version publique. L'adversaire sait poser un mot court, mais il ne cherche pas encore les meilleurs coups. Le mode Confort complet n'est pas implémenté, conformément à la feuille de route.
