import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY, CROSS, MARMOT, cellsCoveredBy } from '../src/engine/rules.js';
import { createGame, tap, updateAutoCrosses, conflicts, saveableGame, restoreGame, SIFFLETS_MAX } from '../src/engine/game.js';
import { puzzleFor, dailyPuzzle } from '../src/engine/daily.js';
import { generatePuzzle } from '../src/engine/generator.js';

// Grille 5×5 à solution unique. Marmottes en (0,3) (1,0) (2,2) (3,4) (4,1).
const P = {
  size: 5,
  regions: [
    1, 0, 0, 0, 0,
    1, 1, 1, 3, 0,
    4, 2, 2, 3, 3,
    4, 4, 4, 3, 3,
    4, 4, 4, 4, 4,
  ],
  solution: [3, 0, 2, 4, 1],
};
const BONNES = [3, 5, 12, 19, 21];
const FAUSSE = 0; // (0,0) : pas une case de la solution

test('toucher une bonne case : croix, puis marmotte, puis vide', () => {
  const g = createGame(P);
  assert.equal(tap(g, 12), 'croix');
  assert.equal(g.cells[12], CROSS);
  assert.equal(g.manuel[12], true);
  assert.equal(tap(g, 12), 'marmotte');
  assert.equal(g.cells[12], MARMOT);
  assert.equal(tap(g, 12), 'vide');
  assert.equal(g.cells[12], EMPTY);
  assert.equal(g.sifflets, SIFFLETS_MAX);
});

test('mauvaise marmotte : un sifflet perdu, la croix reste ; au troisième, défaite', () => {
  const g = createGame(P);
  tap(g, FAUSSE);
  assert.equal(tap(g, FAUSSE), 'erreur');
  assert.equal(g.sifflets, 2);
  assert.equal(g.cells[FAUSSE], CROSS);
  assert.equal(tap(g, FAUSSE), 'erreur');
  assert.equal(tap(g, FAUSSE), 'defaite');
  assert.equal(g.sifflets, 0);
  assert.equal(g.fini, true);
  assert.equal(g.gagne, false);
  assert.equal(tap(g, 12), 'ignore', 'plus rien ne bouge après la fin');
});

test('toutes les bonnes marmottes : victoire', () => {
  const g = createGame(P);
  const resultats = BONNES.map((i) => { tap(g, i); return tap(g, i); });
  assert.deepEqual(resultats, ['marmotte', 'marmotte', 'marmotte', 'marmotte', 'victoire']);
  assert.equal(g.fini, true);
  assert.equal(g.gagne, true);
});

test('croix automatiques : posées autour d\'une marmotte, retirées avec elle, croix manuelles gardées', () => {
  const g = createGame(P);
  tap(g, 2, { autoCroix: true }); // croix manuelle en (0,2), couverte ensuite par (2,2)
  tap(g, 12, { autoCroix: true });
  tap(g, 12, { autoCroix: true });
  for (const j of cellsCoveredBy(P, 12)) assert.equal(g.cells[j], CROSS, `case ${j} barrée`);
  assert.equal(g.manuel[7], false, 'croix automatique');
  assert.equal(g.manuel[2], true, 'croix manuelle intacte');
  tap(g, 12, { autoCroix: true }); // retire la marmotte
  assert.equal(g.cells[7], EMPTY, 'croix automatique retirée');
  assert.equal(g.cells[2], CROSS, 'croix manuelle conservée');
});

test('toucher une croix automatique ne fait rien, même sur une case fausse', () => {
  const g = createGame(P);
  tap(g, 12, { autoCroix: true });
  tap(g, 12, { autoCroix: true }); // marmotte en (2,2) : (1,1) devient croix automatique
  assert.equal(g.cells[6], CROSS);
  assert.equal(tap(g, 6, { autoCroix: true }), 'ignore');
  assert.equal(g.sifflets, SIFFLETS_MAX, 'aucun sifflet perdu');
  assert.equal(g.cells[6], CROSS);
  const zen = createGame(P, { zen: true });
  tap(zen, 12, { autoCroix: true }); tap(zen, 12, { autoCroix: true });
  assert.equal(tap(zen, 6, { autoCroix: true }), 'ignore', 'pas de conflit volontaire en zen');
});

test('désactiver les croix automatiques en cours de partie les efface', () => {
  const g = createGame(P);
  tap(g, 12, { autoCroix: true });
  tap(g, 12, { autoCroix: true });
  updateAutoCrosses(g, false);
  assert.equal(g.cells.filter((c) => c === CROSS).length, 0);
  assert.equal(g.cells[12], MARMOT);
});

test('mode zen : une mauvaise marmotte est posée sans sifflet et surlignée en conflit', () => {
  const g = createGame(P, { zen: true });
  tap(g, 12); tap(g, 12);         // (2,2) bonne
  tap(g, 6); tap(g, 6);           // (1,1) touche (2,2)
  assert.equal(g.cells[6], MARMOT);
  assert.equal(g.sifflets, SIFFLETS_MAX);
  assert.deepEqual(conflicts(g), [6, 12]);
  assert.deepEqual(conflicts(createGame(P)), [], 'pas de surlignage hors zen');
});

test('sauvegarde : aller-retour JSON, sauvegarde abîmée refusée, ancienne sauvegarde tolérée', () => {
  const g = createGame(P, { mode: 'jour', cleJour: '2026-09-26' });
  tap(g, 2); tap(g, 12); tap(g, 12);
  g.ecoule = 4200;
  const relu = restoreGame(JSON.parse(JSON.stringify(saveableGame(g))));
  assert.deepEqual(saveableGame(relu), saveableGame(g));
  assert.equal('auto' in saveableGame(g), false);

  assert.equal(restoreGame(null), null);
  assert.equal(restoreGame({ puzzle: P, cells: [0, 1] }), null, 'mauvaise longueur');
  assert.equal(restoreGame({ puzzle: P, cells: new Array(25).fill(7) }), null, 'valeur inconnue');

  const ancienne = { puzzle: P, mode: 'libre', cells: new Array(25).fill(EMPTY), sifflets: 2 };
  ancienne.cells[0] = CROSS;
  const r = restoreGame(ancienne, { autoCroix: true });
  assert.equal(r.manuel[0], true, 'croix d\'une ancienne sauvegarde considérée manuelle');
  assert.equal(r.cells[0], CROSS);
  assert.equal(r.sifflets, 2);
});

test('demande de puzzle : jour ou partie libre', () => {
  assert.deepEqual(puzzleFor({ type: 'jour', cle: '2026-09-26' }), dailyPuzzle('2026-09-26'));
  assert.deepEqual(puzzleFor({ type: 'libre', size: 6, seed: 9 }), generatePuzzle(6, 9));
});
