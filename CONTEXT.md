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
| 1 | Moteur | Règles, solveur avec unicité, générateur, graine quotidienne, tests. | Fait |
| 2 | Interface | Plateau tactile, tap = croix → marmotte → vide, sifflets, victoire/défaite, chrono, vibration. | Fait |
| 3 | Modes & progression | Puzzle du jour, partie libre 5×5 à 10×10, reprise de la partie en cours, statistiques locales (série, réussis, record par taille). | Fait |
| 4 | PWA | Manifeste, service worker hors ligne (vérifié serveur coupé), icônes, CSP stricte, GitHub Pages activé. | Fait |
| 5 | Finitions | Thème visuel montagne, motifs pour daltonisme, tutoriel, croix automatiques (option), mode zen sans sifflets (option). | À faire |
| 6 | Vérification Pixel | Installation par Fabrizio, test en mode avion, preuve de zéro requête réseau (Chrome distant), APK optionnel. | À faire |

## Installer sur le Pixel (à faire par Fabrizio, une fois)
1. Ouvrir https://fabrizio1305.github.io/alpage/ dans Chrome.
2. Menu ⋮ → « Ajouter à l'écran d'accueil » (ou « Installer l'application »).
3. Lancer Alpage depuis l'écran d'accueil, puis passer en mode avion et vérifier qu'il joue.
Les mises à jour arrivent seules au lancement suivant quand le téléphone est en ligne.

## Vérifié le 2026-09-26 (navigateur intégré, écran 375×812)
- Partie complète par script : erreur → sifflet perdu, solution → victoire, statistiques et série.
- Rechargement en cours de partie : marmottes et sifflets repris.
- Serveur local coupé : la page se charge depuis le cache du service worker.
- 19 tests `npm test` verts (moteur + stockage).

## Prochaine action recommandée
Fabrizio installe le jeu sur le Pixel et dit ce qui gêne (taille des cases, couleurs, lisibilité) → lot 5.

## Journal
- 2026-09-26 : cadrage, règles transcrites, plan par lots. Thème, GitHub Pages et GPL-3.0 validés.
  Lot 1 livré : moteur + 16 tests verts. Dépôt public `Fabrizio1305/alpage` créé et poussé.
  Lots 2-4 livrés : jeu jouable, sauvegarde locale, PWA hors ligne, GitHub Pages activé.
