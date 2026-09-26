# Alpage

Jeu de logique pour téléphone, à jouer hors ligne. Une grille est découpée en alpages colorés :
placez **une marmotte par alpage, par ligne et par colonne**, sans que deux marmottes se
touchent, même en diagonale. Chaque puzzle n'a qu'une seule solution : tout se déduit.

## Engagements
- **Aucune donnée ne quitte le téléphone** : pas de compte, pas de serveur, pas d'analytics,
  pas de police ni de script chargés depuis l'extérieur. Le jeu fonctionne en mode avion.
- **Gratuit et sans publicité.**
- **Open source** sous licence GPL-3.0 : toute version dérivée doit rester ouverte.

## Technique
HTML, CSS et JavaScript sans dépendance ni étape de build. Le moteur de jeu (`src/engine/`)
est testé avec `node --test` (Node 22). Le puzzle du jour est calculé à partir de la date,
donc identique pour tout le monde sans serveur.
