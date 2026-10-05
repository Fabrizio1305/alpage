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
  à partir de la date locale, taille et niveau selon le jour (lun 6 moyen, mar 7 difficile,
  mer 7 difficile, jeu 8 difficile, ven 8 expert, sam-dim 9 expert ; réglable dans
  `src/engine/daily.js`).
- **Service worker** : cache versionné (`CACHE = 'alpage-vN'` dans `sw.js`), servi depuis le
  cache uniquement ; une nouvelle version se télécharge en bloc puis bascule, jamais de mélange
  ancien HTML / nouveau script (constaté une fois avec l'ancienne stratégie). Contrepartie :
  incrémenter `CACHE` à chaque publication (règle dans `CLAUDE.md`, liste vérifiée par test).
- **Générateur** : placement aléatoire valide → alpages qui poussent avec des appétits
  différents → réparation de l'unicité en déplaçant une case de chaque solution parasite vers
  un alpage voisin (case au milieu de son alpage : le voisin s'étend jusqu'à elle par le plus
  court chemin ; les cases détachées suivent, connexité préservée) → retouches des
  frontières, une case à la fois, jusqu'au niveau demandé.
- **Unicité prouvée par les déductions** : chaque déduction de `logic.js` vaut pour toute
  solution, donc un puzzle qu'elles résolvent a une solution unique. La recherche exhaustive
  (`solver.js`) ne sert plus qu'à trouver les solutions parasites, avec un nombre d'étapes
  limité : 500 sur toute la grille, puis 20 000 parmi les cases que les déductions n'ont pas
  exclues. Prouver l'unicité par recherche exhaustive prenait jusqu'à 112 s en 15×15.
- **Niveaux** (`src/engine/logic.js`) : un solveur « à la main » essaie toujours la déduction
  la plus simple ; la plus dure dont il a eu besoin donne le niveau. Facile : dernière place
  possible. Moyen : enfermement simple (un alpage dans une ligne ou une colonne, et
  l'inverse) ou case qui barrerait toute une unité. Difficile : k alpages dans k lignes ou
  colonnes. Expert : hypothèse courte (une marmotte ici → impasse par les déductions faciles
  et moyennes). Un puzzle que ces déductions ne résolvent pas est rejeté. Si le niveau visé
  reste hors d'atteinte après 40 essais, le puzzle le plus proche est rendu et l'interface
  affiche son vrai niveau (jamais observé : 0 sur 300 graines en 5×5, 0 sur 150 de 6×6 à
  10×10).
- **Records** : un par taille et par niveau (clé `8-expert` dans `alpage.stats`). Les records
  d'avant les niveaux (clé `8`) restent stockés mais ne s'affichent plus.

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

## Niveaux de difficulté (demande de Fabrizio, 2026-10-05 : « je cale un peu »)
Mesure avant le lot, 200 graines par taille : 65 % (10×10) à 94 % (5×5) des puzzles ne
demandaient que des déductions faciles ou moyennes ; l'expert sortait 0 à 5 % du temps.

| # | Lot | Contenu | Statut |
|---|-----|---------|--------|
| B1 | Niveaux | Solveur par déduction (`logic.js`), générateur qui vise un niveau, sélecteur « Niveau » en partie libre (mémorisé avec la taille), niveau affiché au-dessus du plateau, puzzle du jour gradué dans la semaine, records par taille et niveau, solveur exhaustif accéléré (×4 en 10×10). Textes dans les 5 langues. Cache v8. | Fait, à valider sur le Pixel |

Temps de génération mesurés sur le PC (150 graines) : expert 9×9 91 ms en moyenne, 560 ms au
pire ; expert 10×10 146 ms en moyenne, 720 ms au pire ; les autres niveaux restent sous
250 ms au pire. Compter 2 à 3 fois plus sur le téléphone ; la génération tourne dans le
Web Worker, l'écran affiche « Les marmottes cherchent leur alpage… ».

## Grandes grilles (demande de Fabrizio, 2026-10-05)
| # | Lot | Contenu | Statut |
|---|-----|---------|--------|
| B2 | Jusqu'à 15×15 | `MAX_SIZE = 15` (partie libre ; le puzzle du jour reste de 6×6 à 9×9). 15 couleurs d'alpage distinctes en clair et en sombre, 15 motifs. Générateur accéléré (voir « Unicité prouvée par les déductions »). Cases de 25 px en 15×15 sur le Pixel en portrait (27 px en 14×14) : jouable mais serré. Fabrizio a autorisé à s'arrêter à 14×14 si 15×15 n'est pas viable : gardé à 15, la génération tient (ci-dessous) ; repli = `MAX_SIZE = 14` dans `src/engine/rules.js` et cache incrémenté. | Fait, à valider sur le Pixel |

Temps de génération sur le PC, 60 graines par taille et par niveau (moyenne / pire) :
15×15 facile 307 / 1 198 ms, moyen 59 / 291 ms, difficile 65 / 355 ms, expert 229 /
1 231 ms ; 12×12 expert 87 / 348 ms ; 10×10 expert 37 / 153 ms. Niveau visé atteint à
chaque fois ; solution trouvée par déduction égale à la solution du générateur à chaque fois.
Queue de distribution, 200 graines : 15×15 expert médiane 163 ms, 99 % sous 1 476 ms, pire
1 942 ms ; 14×14 expert médiane 137 ms, 99 % sous 850 ms, pire 914 ms.

## Points ouverts
- **Romanche** : traduit par Claude, non relu par une personne de langue romanche. À faire
  relire si le jeu est diffusé au-delà de Fabrizio (textes dans `src/ui/i18n.js`, clé `rm`).
- Le manifeste (nom et description de l'app installée) reste en français.

## Prochaine action recommandée
Fabrizio : sur le Pixel, ouvrir Alpage en ligne, le fermer complètement puis le rouvrir (au
besoin deux fois) pour passer à la version 8 ; jouer quelques parties « Difficile » et
« Expert » et dire
si le niveau expert est assez dur, et si la progression du puzzle du jour dans la semaine
convient, et si les cases du 15×15 sont assez grandes au doigt. Point ouvert facultatif : faire relire le romanche (nouveaux textes des niveaux
compris) avant une diffusion plus large.

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

## État au 2026-10-05
- **Version** : v8 (`CACHE = 'alpage-v8'`), PR #1 (branche `ccr-ecf87b06-n26sgu`) fusionnée
  dans `main` à la demande de Fabrizio (« pousse tout pour que je puisse tester sur mon
  pixel ») ; GitHub Pages publie depuis `main`. Pas encore testée sur le Pixel.
- **Tests** : `npm test`, 56 verts (dont 9 pour les niveaux dans `test/logic.test.js`, qui
  couvrent aussi 12×12 et 15×15, et `test/style.test.js` : une couleur et un motif par alpage).
- **Vérifié dans Chromium (412×870 et paysage 870×412)** : sélecteur de niveau, ligne
  « Partie libre · 9 × 9 · Expert », choix conservés au rechargement, victoire → record
  « 9×9 expert », interface en allemand, aucune requête externe, aucune erreur console.
  Puis 15×15 expert en clair et en sombre : prêt en moins de 0,6 s, 15 couleurs distinctes,
  cases de 24,9 px.
- **Mise à jour v7 → v8 simulée** (Chromium, profil persistant, v7 en cache puis v8 servie) :
  1re ouverture en ligne = v8 téléchargée en arrière-plan, v7 encore affichée ; 2e ouverture
  = v8 affichée, cache v7 supprimé ; puis v8 jouable serveur coupé. Piège de test : si les
  fichiers v8 sont plus anciens que les v7 sur le disque, `python3 -m http.server` répond 304
  à `sw.js` et la mise à jour ne part pas (artefact local, pas le cas sur GitHub Pages).

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
- 2026-10-05 : demande « niveaux plus difficiles ». Mesure : la difficulté des puzzles n'était
  pas maîtrisée (surtout faciles et moyens). Lot B1 livré sur branche (cache v8) : 4 niveaux
  notés par un solveur par déduction, puzzle du jour gradué ; 50 tests verts.
  Demande « grilles jusqu'à 15×15 » : lot B2 sur la même branche ; unicité prouvée par les
  déductions (15×15 expert : de 44 s à 0,23 s en moyenne) ; 56 tests verts.
