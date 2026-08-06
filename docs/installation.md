# Installation de Sérénimot

Sérénimot est une application web installable. Elle se lance depuis une URL HTTPS, puis peut être ajoutée à l'écran d'accueil sur mobile ou installée depuis certains navigateurs desktop.

La première ouverture doit se faire avec une connexion Internet. Ensuite, l'application peut reprendre une partie hors connexion si le premier chargement s'est terminé correctement.

## Publier avec GitHub Pages

Le dépôt contient le workflow `.github/workflows/deploy-pages.yml`.

Pour publier :

1. créer un dépôt GitHub ;
2. pousser le projet sur la branche `main` ;
3. ouvrir les réglages du dépôt GitHub ;
4. aller dans `Pages` ;
5. choisir `GitHub Actions` comme source ;
6. lancer le workflow `Deploy GitHub Pages`, ou pousser à nouveau sur `main`.

GitHub publie ensuite le site à une adresse du type :

```text
https://nom-utilisateur.github.io/serenimot/
```

Le chemin exact dépend du nom du compte GitHub et du dépôt.

## Installer sur iPhone ou iPad

Sur iOS et iPadOS, l'installation se fait depuis Safari.

1. ouvrir l'URL GitHub Pages dans Safari ;
2. attendre que l'écran d'accueil de Sérénimot soit chargé ;
3. toucher le bouton de partage ;
4. choisir `Ajouter à l'écran d'accueil` ;
5. confirmer le nom `Sérénimot`.

L'icône apparaît ensuite sur l'écran d'accueil. En l'ouvrant depuis cette icône, le jeu s'affiche comme une application autonome.

## Installer sur Android

Sur Android, utiliser de préférence Chrome.

1. ouvrir l'URL GitHub Pages dans Chrome ;
2. attendre que l'application soit chargée ;
3. ouvrir le menu du navigateur ;
4. choisir `Installer l'application` ou `Ajouter à l'écran d'accueil` ;
5. confirmer l'installation.

Le libellé exact peut varier selon la version d'Android, Chrome ou Samsung Internet.

## Utiliser sur Mac

Sur Mac, Sérénimot fonctionne dans Safari, Chrome, Edge et Firefox.

L'installation comme application dépend du navigateur :

- Safari : ouvrir le site, puis utiliser l'option d'ajout au Dock si elle est disponible ;
- Chrome ou Edge : ouvrir le site, puis utiliser l'icône d'installation dans la barre d'adresse ou le menu du navigateur ;
- Firefox : jouer dans l'onglet du navigateur.

## Utiliser sur Windows

Sur Windows, Sérénimot fonctionne dans Chrome, Edge et Firefox.

Pour une installation proche d'une application :

1. ouvrir l'URL dans Chrome ou Edge ;
2. utiliser l'icône d'installation dans la barre d'adresse, ou le menu du navigateur ;
3. confirmer l'installation.

Firefox permet de jouer dans le navigateur, mais ne propose pas toujours une installation PWA complète.

## Fonctionnement hors connexion

Après le premier chargement complet, le service worker garde localement :

- l'interface ;
- les fichiers de l'application ;
- le dictionnaire principal ;
- les icônes nécessaires à l'installation.

La partie en cours et les préférences restent stockées localement sur l'appareil. Une partie commencée sur iPhone ne sera donc pas automatiquement disponible sur Mac ou Windows.

## Points à vérifier après publication

Après chaque publication importante :

1. ouvrir l'URL GitHub Pages en ligne ;
2. lancer une nouvelle partie ;
3. fermer puis rouvrir la page ;
4. vérifier que le bouton `Continuer` reprend la partie ;
5. installer sur l'écran d'accueil d'un iPhone ou iPad ;
6. ouvrir depuis l'icône installée ;
7. tester une reprise hors connexion après un premier chargement complet.
