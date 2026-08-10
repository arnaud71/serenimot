# Historique des versions

Ce fichier résume les changements notables de Sérénimot.

Le projet suit une version applicative déclarée dans `package.json`. Les builds publics ajoutent un numéro de build et un identifiant Git court affichés dans l'application.

## 0.1.0 - En cours

### Ajouté

- Affichage de la version de l'application dans les règles.
- Déploiement de prévisualisation sur la branche `dev`, accessible séparément de la production.
- Icône d'installation distincte pour la version dev.
- Boutons de retour flottants sur les pages longues : règles, lexique, options et explication d'installation.

### Amélioré

- Déplacement tactile des lettres entre la réserve, le chevalet et la grille.
- Réorganisation de l'interface de jeu sur ordinateur et smartphone.
- Aide contextuelle selon l'état réel du tour.
- Bouton de sens plus explicite sur smartphone pour choisir ou changer la direction de pose.
- Documentation des règles, du lexique, de l'installation et des interactions.
- Documentation du bouton `Sens → / ↓` dans les règles et interactions.
- Captures d'écran de documentation mises à jour avec la nouvelle interface.
- Affichage du niveau du robot avec badge et code couleur.
- Formulation des limites connues actualisée dans le README.

### Corrigé

- Cohérence du compteur d'indice affiché sur le bouton, dans l'infobulle et dans l'aide.
- Direction respectée dès les premières lettres posées sur le plateau.
- Cas de déplacement d'une suite de lettres sur le plateau.
- Erreur de build liée à une fonction inutilisée.

### Technique

- Ajout de templates GitHub en français pour bugs et demandes de fonctionnalités.
- Ajout d'un test e2e ciblé sur la saisie verticale après sélection du plateau.
- Ajout d'un sitemap et de liens canoniques pour le site officiel.
- Clarification des mentions liées à l'ODS comme référence non intégrée.
