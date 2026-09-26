# Alpage — fichier d'état

Titre de travail : **Alpage** (le nom original du jeu du Play Store n'est pas repris).

## Le jeu en une phrase
Grille N×N découpée en N alpages (régions colorées). Placer **une marmotte par alpage, par
ligne et par colonne**, sans que deux marmottes se touchent, même en diagonale. **3 sifflets
d'alerte** (les cœurs de l'original) : une marmotte posée au mauvais endroit en coûte un.
Un puzzle n'a qu'une seule solution : tout se déduit, rien ne se devine.

## Règles transcrites de l'original (copie d'écran du 2026-09-26)
- Territoire exclusif : exactement un pion par section colorée.
- Isolement : pas deux pions sur une même ligne, une même colonne, ni en contact (diagonale
  comprise).
- Double-tap pour poser un pion ; 3 erreurs autorisées ; une erreur = un cœur perdu.
- Puzzle quotidien ; hors ligne.
- Écartés volontairement : publicités, classements mondiaux (exigent un serveur).

## Contraintes non négociables
- **Local** : aucun service distant à l'exécution (ni Vercel, ni Supabase, ni analytics, ni
  CDN, ni police externe). Le jeu doit fonctionner en mode avion.
- Gratuit, sans pub, sans compte. Progression et statistiques dans le téléphone uniquement
  (`localStorage`).

## Décisions
- **Prises (validées par Fabrizio le 2026-09-26)** : thème marmottes / alpages ; livraison par
  **GitHub Pages** depuis le dépôt public `Fabrizio1305/alpage` ; licence **GPL-3.0-or-later**
  (toute version dérivée doit rester ouverte ; changeable tant que Fabrizio est seul auteur).
- **Techniques** : PWA en HTML/CSS/JS vanilla, sans framework ni build ; moteur pur dans
  `src/engine/`, testé avec `node --test` (Node 22) ; puzzle du jour = générateur déterministe
  à partir de la date locale, taille selon le jour (lun 6, mar-mer 7, jeu-ven 8, sam-dim 9,
  réglable dans `src/engine/daily.js`).
- **Générateur** : placement aléatoire valide → alpages qui poussent avec des appétits
  différents → réparation de l'unicité en déplaçant une case de chaque solution parasite vers
  un alpage voisin (connexité préservée). Mesuré sur le PC : 10×10 en 20 ms en moyenne,
  188 ms au pire sur 30 graines.

## Lots
| # | Lot | Contenu | Statut |
|---|-----|---------|--------|
| 0 | Cadre | Dépôt, fichier d'état, licence GPL-3.0, README, remote GitHub public. | Fait |
| 1 | Moteur | Règles, solveur avec unicité, générateur, graine quotidienne, 16 tests. | Fait |
| 2 | Interface | Plateau tactile plein écran, tap = croix « pas ici », double-tap = marmotte, sifflets, détection de victoire, chrono, vibration. | À faire |
| 3 | Modes & progression | Puzzle du jour, partie libre par taille (5×5 à 10×10), reprise de la partie en cours, statistiques locales (série quotidienne, meilleurs temps). | À faire |
| 4 | PWA | `manifest.json`, service worker hors ligne (cache-first), icônes, CSP stricte, activation de GitHub Pages. | À faire |
| 5 | Finitions | Thème visuel montagne, mode sombre, motifs pour daltonisme, tutoriel 3 écrans, mode zen sans sifflets (option). | À faire |
| 6 | Vérification Pixel | Installation, test en mode avion, preuve de zéro requête réseau, APK optionnel. | À faire |

## Prochaine action recommandée
Claude démarre le lot 2 (interface de jeu) : rien n'attend Fabrizio.

## Journal
- 2026-09-26 : cadrage, règles transcrites, plan par lots. Thème, GitHub Pages et GPL-3.0 validés.
  Lot 1 livré : moteur + 16 tests verts. Dépôt public `Fabrizio1305/alpage` créé et poussé.
