// État d'une partie, sans interface : effet de chaque geste, croix automatiques, fin de partie.
// L'interface (src/ui/app.js) appelle ces fonctions puis se contente de dessiner l'état.

import { EMPTY, CROSS, MARMOT, isSolved, findConflicts, cellsCoveredBy } from './rules.js';

export const SIFFLETS_MAX = 3;

/** Nouvelle partie. `mode` : 'jour' ou 'libre' ; `zen` : sans sifflets, conflits surlignés. */
export function createGame(puzzle, { mode = 'libre', cleJour = null, zen = false } = {}) {
  const n = puzzle.size * puzzle.size;
  return {
    puzzle,
    mode,
    cleJour,
    zen,
    cells: new Array(n).fill(EMPTY),  // EMPTY / CROSS / MARMOT
    manuel: new Array(n).fill(false), // true : croix posée par le joueur
    auto: new Array(n).fill(0),       // nombre de marmottes qui interdisent la case
    sifflets: SIFFLETS_MAX,
    fini: false,
    gagne: false,
    ecoule: 0,                        // ms de jeu cumulées
  };
}

/** Croix automatiques : recalculées depuis zéro à partir des marmottes posées. */
export function updateAutoCrosses(game, enabled) {
  const n = game.cells.length;
  const auto = new Array(n).fill(0);
  if (enabled) {
    for (let i = 0; i < n; i++) {
      if (game.cells[i] !== MARMOT) continue;
      for (const j of cellsCoveredBy(game.puzzle, i)) auto[j]++;
    }
  }
  for (let j = 0; j < n; j++) {
    if (game.cells[j] === MARMOT) continue;
    if (auto[j] > 0 && game.cells[j] === EMPTY) game.cells[j] = CROSS;
    else if (auto[j] === 0 && game.cells[j] === CROSS && !game.manuel[j]) game.cells[j] = EMPTY;
  }
  game.auto = auto;
}

/**
 * Joue un toucher sur la case `i` et renvoie ce qui s'est passé :
 * 'ignore', 'croix', 'marmotte', 'vide', 'erreur', 'victoire' ou 'defaite'.
 */
export function tap(game, i, { autoCroix = false } = {}) {
  if (game.fini) return 'ignore';
  const etat = game.cells[i];
  // Case interdite par une marmotte posée : ni sifflet perdu, ni conflit volontaire.
  if (etat === CROSS && game.auto[i] > 0) return 'ignore';
  let resultat;
  if (etat === EMPTY) {
    game.cells[i] = CROSS;
    game.manuel[i] = true;
    resultat = 'croix';
  } else if (etat === CROSS) {
    const { size, solution } = game.puzzle;
    const bonne = solution[Math.floor(i / size)] === i % size;
    if (!bonne && !game.zen) {
      game.sifflets--;
      if (game.sifflets > 0) return 'erreur';
      game.fini = true;
      return 'defaite';
    }
    game.cells[i] = MARMOT;
    game.manuel[i] = false;
    resultat = 'marmotte';
  } else {
    game.cells[i] = EMPTY;
    game.manuel[i] = false;
    resultat = 'vide';
  }
  updateAutoCrosses(game, autoCroix);
  if (isSolved(game.puzzle, game.cells)) {
    game.fini = true;
    game.gagne = true;
    return 'victoire';
  }
  return resultat;
}

/** Cases en conflit à surligner (mode zen uniquement). */
export function conflicts(game) {
  return game.zen ? findConflicts(game.puzzle, game.cells) : [];
}

/** Ce qu'il faut sauvegarder (les croix automatiques se recalculent). */
export function saveableGame(game) {
  const { auto, ...reste } = game;
  return reste;
}

/** Recrée une partie depuis une sauvegarde ; null si elle est incomplète ou abîmée. */
export function restoreGame(saved, { autoCroix = false } = {}) {
  if (!saved || typeof saved !== 'object') return null;
  const { puzzle } = saved;
  if (!puzzle || !Number.isInteger(puzzle.size) || !Array.isArray(puzzle.regions) || !Array.isArray(puzzle.solution)) return null;
  const n = puzzle.size * puzzle.size;
  if (puzzle.regions.length !== n || puzzle.solution.length !== puzzle.size) return null;
  const { cells } = saved;
  if (!Array.isArray(cells) || cells.length !== n || !cells.every((c) => c === EMPTY || c === CROSS || c === MARMOT)) return null;

  const game = createGame(puzzle, {
    mode: saved.mode === 'jour' ? 'jour' : 'libre',
    cleJour: typeof saved.cleJour === 'string' ? saved.cleJour : null,
    zen: saved.zen === true,
  });
  game.cells = [...cells];
  // Sauvegardes d'avant les croix automatiques : toutes les croix étaient posées à la main.
  game.manuel = Array.isArray(saved.manuel) && saved.manuel.length === n
    ? saved.manuel.map(Boolean)
    : cells.map((c) => c === CROSS);
  game.sifflets = Number.isInteger(saved.sifflets) ? Math.max(0, Math.min(SIFFLETS_MAX, saved.sifflets)) : SIFFLETS_MAX;
  game.fini = saved.fini === true;
  game.gagne = saved.gagne === true;
  game.ecoule = Number.isFinite(saved.ecoule) && saved.ecoule > 0 ? saved.ecoule : 0;
  updateAutoCrosses(game, autoCroix);
  return game;
}
