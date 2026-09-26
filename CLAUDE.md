# Alpage (dossier `GamePal`)

Jeu de logique type « Queens » (une marmotte par alpage, par ligne, par colonne, jamais deux
voisines), **PWA 100 % locale** pour le Pixel 8 Pro : sans pub, gratuit, aucune donnée ne
quitte le téléphone.

- Lire **`CONTEXT.md`** (fichier d'état) en début de session et le vérifier contre le code.
- HTML/CSS/JS vanilla, **aucune dépendance, aucun build, aucun appel réseau à l'exécution**
  (pas de CDN, pas de police externe, pas d'analytics). CSP stricte dans `index.html`.
- Logique de jeu pure dans `src/engine/` (testée avec `node --test`), interface dans `src/ui/`.
- Textes de l'interface en français.
- **Toute modification d'un fichier servi ⇒ incrémenter `CACHE` dans `sw.js`** (cache versionné,
  mise à jour en bloc). Nouveau fichier ⇒ l'ajouter à la liste `FICHIERS` ; `npm test` le vérifie.
