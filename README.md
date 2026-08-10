# Sérénimot

Jeu original de lettres croisées sur grille, sans compte, sans publicité, jouable en ligne et installable comme une application.

Site officiel : [serenimot.fr](https://serenimot.fr/). L'application reste aussi accessible via [GitHub Pages](https://arnaud71.github.io/serenimot/). Le code et la documentation sont disponibles dans le [dépôt GitHub](https://github.com/arnaud71/serenimot).

Retours publics : [signaler un bug](https://github.com/arnaud71/serenimot/issues/new?template=bug.md) ou [proposer une idée](https://github.com/arnaud71/serenimot/issues/new?template=demande-fonctionnalite.md).

Sérénimot est un jeu original de lettres croisées sur grille. Cette première base vise un prototype local simple : commencer une partie, placer des lettres par sélection puis clic ou toucher, annuler son coup, valider des mots avec un dictionnaire local, sauvegarder et reprendre.

Accroche de travail : « Les mots, à votre rythme. »

## Pour qui ?

Sérénimot s'adresse aux personnes qui aiment les jeux de lettres sur grille et souhaitent une expérience plus calme, sans inscription, sans publicité et utilisable sur ordinateur, tablette ou smartphone.

## Installation développeur

```bash
npm install
npm run dev
```

Pour l'installation sur iPhone, iPad, Android, Mac ou Windows, voir [docs/installation.md](docs/installation.md).

Pour les gestes de jeu et les captures d'écran des interactions, voir [docs/interactions.md](docs/interactions.md).

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

## Anti-confusion

### Sérénimot est-il une version de Scrabble ?

Non. Sérénimot est un jeu original et indépendant de lettres croisées sur grille. Il s'inspire du plaisir général des jeux de lettres, mais il utilise son propre nom, son propre plateau, ses propres règles, son propre système de score et un lexique ouvert documenté.

Le dépôt ne doit donc pas être présenté comme une copie, une variante officielle ou une application affiliée à Scrabble. Toute comparaison éventuelle doit rester descriptive et ne pas laisser croire à un partenariat.

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

Le dictionnaire est maintenant large et fondé sur des sources ouvertes, mais certaines règles lexicales restent à affiner avant une version considérée comme stable. Le robot cherche des coups localement avec plusieurs niveaux de difficulté, mais son équilibre de jeu et ses performances doivent encore être observés sur différentes tailles de grille et différents appareils. Le mode Confort complet reste prévu pour une étape ultérieure, après retours d'usage.
