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
- **Service worker** : cache versionné (`CACHE = 'alpage-vN'` dans `sw.js`), servi depuis le
  cache uniquement ; une nouvelle version se télécharge en bloc puis bascule, jamais de mélange
  ancien HTML / nouveau script (constaté une fois avec l'ancienne stratégie). Contrepartie :
  incrémenter `CACHE` à chaque publication (règle dans `CLAUDE.md`, liste vérifiée par test).
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
| 5 | Finitions | Croix automatiques (réglage), mode zen sans sifflets avec conflits surlignés (prochaine partie), tutoriel 3 étapes au premier lancement et bouton « ? », motifs pour daltonisme (réglage), habillage montagne clair/sombre. Les trois réglages sont **désactivés par défaut** (demande de Fabrizio, 2026-09-26). | Fait |
| 6 | Vérification Pixel | Installé sur le Pixel 8 Pro, joue en mode avion (Fabrizio, 2026-09-26). Zéro requête externe vérifié depuis l'adresse publique. APK jugé inutile. | Fait |

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

## Vérifié le 2026-09-26 (lot 5, navigateur intégré 375×812, clair et sombre)
- Tutoriel au premier lancement, 3 étapes illustrées, marqué vu ; réouvrable par « ? ».
- Croix automatiques : 33 croix attendues et posées pour une marmotte en 9×9 ; retirées au retrait.
- Réglages persistants ; motifs visibles ; mode zen : badge, sifflets masqués, 2 conflits
  surlignés puis effacés.
- 24 tests `npm test` verts.

## Audit du 2026-09-26 (Fable) — lots correctifs
Verdict : jeu utilisable, rien de cassé. Correctifs approuvés en bloc par Fabrizio (« go tous
les lots »).

| # | Lot correctif | Contenu | Statut |
|---|-----|---------|--------|
| A1 | Documentation | Fichier d'état réaligné (défauts, version du cache), README avec l'adresse du jeu. | Fait |
| A2 | Confort de jeu | Tap sur une croix automatique ignoré ; zen exclu des records (compte pour la série) ; bouton « Voir la grille » ; chrono qui reprend au retour et après rechargement. | Fait |
| A3 | Robustesse | État de partie extrait dans `src/engine/game.js` et testé ; génération dans `src/ui/worker.js` (8 grilles 10×10 sans aucune tâche bloquante) ; service worker en `cache: 'reload'` contre le cache HTTP de Pages (`max-age=600`, vérifié). Fait avant A2 pour tester les règles. | Fait |
| A4 | Paysage | Deux colonnes sous 520 px de haut : cases de 42 px au lieu de 22 px en 915×412. L'app installée reste verrouillée en portrait (manifeste). | Fait |
| A5 | Langues et vie privée (demande de Fabrizio) | Interface en français, allemand (usage suisse, sans « ß »), italien, romanche (rumantsch grischun) et anglais, dans `src/ui/i18n.js`. Langue du téléphone par défaut, anglais si inconnue, choix manuel dans les réglages. Bandeau « Sans pub · Sans pistage · Vos données restent sur ce téléphone » sous le jeu, qui ouvre l'encadré « Respectueux de votre vie privée » des réglages (avec lien vers le code source). 6 tests de cohérence des traductions. | Fait |

## Points ouverts
- **Romanche** : traduit par Claude, non relu par une personne de langue romanche. À faire
  relire si le jeu est diffusé au-delà de Fabrizio (textes dans `src/ui/i18n.js`, clé `rm`).
- Le manifeste (nom et description de l'app installée) reste en français.

## Prochaine action recommandée
Aucune : version 7 validée sur le Pixel par Fabrizio (2026-09-26). Seul point ouvert
facultatif : faire relire le romanche avant une diffusion plus large.

## État au 2026-09-26, fin de session
- **Version en ligne** : v7 (`CACHE = 'alpage-v7'`), https://fabrizio1305.github.io/alpage/,
  validée sur le Pixel 8 Pro. Dépôt `Fabrizio1305/alpage` à jour, arbre de travail propre.
- **Variables d'environnement** : aucune. Le jeu n'a ni secret, ni `.env.local`, ni service
  distant ; rien à régénérer sur une autre machine.
- **Tests** : `npm test`, 40 verts (moteur, partie, stockage, service worker, traductions).
- **Reprendre sur une autre machine** : `git clone`, `npm test`, puis aperçu local via
  `.claude/launch.json` (serveur Python sur le port 8765). Aucune dépendance à installer.
- **Astuce de test navigateur** : effacer le stockage depuis une page qui n'exécute pas le jeu
  (ex. `/README.md`). Depuis une page du jeu ouverte, la sauvegarde automatique à la fermeture
  réécrit la partie juste après l'effacement et fausse le test suivant.
- **Suite possible, non planifiée** : relecture du romanche par une personne de langue
  romanche ; manifeste traduit (nom et description de l'app installée).

## Journal
- 2026-09-26 : cadrage, règles transcrites, plan par lots. Thème, GitHub Pages et GPL-3.0 validés.
  Lot 1 livré : moteur + 16 tests verts. Dépôt public `Fabrizio1305/alpage` créé et poussé.
  Lots 2-4 livrés : jeu jouable, sauvegarde locale, PWA hors ligne, GitHub Pages activé.
  Lot 6 : installé sur le Pixel, fonctionne en mode avion. Version 1 jouable.
  Lot 5 livré : réglages, zen, tutoriel, motifs, habillage ; service worker versionné (v2).
  Réglages désactivés par défaut, migration des réglages enregistrés en v1 (cache v3).
  Audit Fable : 9 constats, aucun bloquant ; lots A1 à A4 approuvés puis livrés (cache v6).
  Demande A5 : traduction (langues suisses + anglais) et mention vie privée dans l'interface.
  A5 livré (cache v7) : 5 langues, bandeau et encadré vie privée ; 40 tests verts.
  Version 7 validée sur le Pixel par Fabrizio.
