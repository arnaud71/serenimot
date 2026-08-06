# Accessibilité

## Choix actuels

- Boutons principaux avec cible minimale de 48 px.
- Préparation du mot par clic ou toucher, puis pose en une seule action sur le plateau.
- Aucun glisser-déposer obligatoire.
- Messages de statut avec `aria-live`.
- Plateau exposé comme grille avec libellés de lignes et colonnes.
- Contraste standard élevé et option de contraste renforcé.
- Trois tailles de texte préparées : normale, grande, très grande.
- Respect de `prefers-reduced-motion`.
- Aucun chronomètre.

## Tests manuels à effectuer

- Zoom navigateur à 200 %.
- Navigation clavier.
- VoiceOver sur Mac ou iPad.
- iPad paysage.
- Smartphone portrait.
- Mode hors ligne après build et preview.

## Limites connues

La navigation clavier du plateau fonctionne par tabulation native mais n'a pas encore de raccourcis directionnels. L'explication détaillée du score dans l'interface sera ajoutée après stabilisation de la boucle de base.
