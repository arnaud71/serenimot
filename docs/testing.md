# Tests

Ce projet utilise trois niveaux de verification automatisée : tests unitaires, tests d'interface Playwright et test PWA hors ligne.

## Commande recommandée

```bash
npm run verify
```

Cette commande lance, dans l'ordre :

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run test:e2e:pwa`

C'est la commande à utiliser avant un commit de stabilisation ou avant de publier une version.

## Tests unitaires

```bash
npm run test
```

Ces tests vérifient surtout le moteur du jeu et les règles qui peuvent tourner sans navigateur.

## Tests e2e d'interface

```bash
npm run test:e2e
```

Cette suite lance l'application avec le serveur de développement Vite. Elle couvre les parcours interactifs principaux sur desktop, mobile et tablette.

Le test PWA hors ligne n'est pas inclus dans cette commande, car le service worker n'est pas fiable en mode serveur de développement.

## Test PWA hors ligne

```bash
npm run test:e2e:pwa
```

Cette suite utilise `npm run build` puis `npm run preview`. Elle vérifie que l'application installable charge avec son service worker, passe hors ligne, démarre une partie et joue un vrai premier coup sans réseau.

Ce test doit rester séparé de `npm run test:e2e`, parce qu'il valide le comportement de production cache/service worker plutôt que l'interface en développement.

## En cas d'echec

- Si `npm run test:e2e` échoue sur le service worker, vérifier que `pwa-offline.spec.ts` est bien exclu de `playwright.config.ts`.
- Si `npm run test:e2e:pwa` échoue, commencer par vérifier que `npm run build` passe.
- Si un port local ne peut pas s'ouvrir dans l'environnement Codex, relancer la commande avec l'autorisation hors sandbox.
