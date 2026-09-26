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
- **Prises** : PWA en HTML/CSS/JS vanilla, sans framework ni build ; moteur de jeu pur testé
  avec `node --test` (Node 22 sur le PC maison) ; puzzle du jour = générateur déterministe à
  partir de la date (même puzzle partout, sans serveur).
- **À valider par Fabrizio** :
  1. Thème marmottes / alpages (universel, clin d'œil suisse).
  2. Mode de livraison sur le Pixel : **GitHub Pages** (dépôt public, installation en un clic
     depuis Chrome, mises à jour automatiques) ou **APK Capacitor** (dépôt privé possible,
     zéro réseau absolu, mise à jour manuelle). Recommandation : GitHub Pages, APK en option
     plus tard depuis le même code.

## Lots
| # | Lot | Contenu | Statut |
|---|-----|---------|--------|
| 0 | Cadre | Dépôt local, fichier d'état, décisions. Remote GitHub selon décision de livraison. | En cours |
| 1 | Moteur | Représentation grille/régions, validation des règles, solveur avec contrôle d'unicité, générateur (solution aléatoire → régions par croissance → rejet si non unique), graine quotidienne, tests. | À faire |
| 2 | Interface | Plateau tactile plein écran, tap = croix « pas ici », double-tap = marmotte, sifflets, détection de victoire, chrono, vibration. | À faire |
| 3 | Modes & progression | Puzzle du jour, partie libre par taille (5×5 à 10×10), reprise de la partie en cours, statistiques locales (série quotidienne, meilleurs temps). | À faire |
| 4 | PWA | `manifest.json`, service worker hors ligne (cache-first), icônes, CSP stricte, hébergement. | À faire |
| 5 | Finitions | Thème visuel montagne, mode sombre, motifs pour daltonisme, tutoriel 3 écrans, mode zen sans sifflets (option). | À faire |
| 6 | Vérification Pixel | Installation, test en mode avion, preuve de zéro requête réseau, APK optionnel. | À faire |

## Prochaine action recommandée
Fabrizio valide le thème et le mode de livraison → Claude démarre le lot 1 (moteur + tests).

## Journal
- 2026-09-26 : cadrage, règles transcrites, plan par lots. Dépôt git local, pas encore de remote.
