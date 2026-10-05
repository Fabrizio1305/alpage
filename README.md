# Alpage

Jeu de logique pour téléphone, à jouer hors ligne. Une grille est découpée en alpages colorés :
placez **une marmotte par alpage, par ligne et par colonne**, sans que deux marmottes se
touchent, même en diagonale. Chaque puzzle n'a qu'une seule solution : tout se déduit.

**Jouer : https://fabrizio1305.github.io/alpage/** — dans Chrome sur Android, menu ⋮ puis
« Installer l'application » : le jeu fonctionne ensuite hors ligne, comme une app.

## Comment jouer
- Touchez une case pour y mettre une croix (« pas ici »), touchez encore pour une marmotte,
  une troisième fois pour vider la case.
- Une marmotte mal placée coûte un **sifflet d'alerte** ; au troisième, la partie est perdue.
- **Quatre niveaux** : facile, moyen, difficile, expert. Le niveau dit quelle déduction il
  faudra : dernière place possible (facile), un alpage enfermé dans une ligne (moyen),
  plusieurs alpages enfermés dans autant de lignes (difficile), une hypothèse courte menant à
  une impasse (expert). Aucun niveau n'oblige à deviner.
- **Puzzle du jour** identique pour tous, de plus en plus dur dans la semaine : 6×6 moyen le
  lundi, difficile du mardi au jeudi, expert du vendredi au dimanche (jusqu'à 9×9). Partie
  libre de 5×5 à 15×15, au niveau choisi.
- Réglages (bouton ⚙), tous désactivés par défaut : **croix automatiques** autour de chaque
  marmotte, **mode zen** sans sifflets où les conflits sont surlignés, **motifs** sur les
  alpages pour les personnes daltoniennes.
- Série quotidienne, parties réussies et records par taille et par niveau restent dans le
  téléphone.
- **Langues** : français, Deutsch, italiano, rumantsch et English, selon la langue du téléphone
  ou au choix dans les réglages.

## Engagements
- **Aucune donnée ne quitte le téléphone** : pas de compte, pas de serveur, pas d'analytics,
  pas de police ni de script chargés depuis l'extérieur. Le jeu fonctionne en mode avion.
- **Gratuit et sans publicité.**
- **Open source** sous licence GPL-3.0 : toute version dérivée doit rester ouverte.

## Technique
HTML, CSS et JavaScript sans dépendance ni étape de build. Le moteur de jeu (`src/engine/`)
est testé avec `node --test` (Node 22). Le puzzle du jour est calculé à partir de la date,
donc identique pour tout le monde sans serveur.
