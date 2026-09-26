import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areAdjacent, isValidSolution, findConflicts, isSolved, EMPTY, CROSS, MARMOT } from '../src/engine/rules.js';

// Grille 5×5 à solution unique (générateur, graine 7), vérifiée par le solveur.
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

test('contact : côté, coin, mais pas la case elle-même ni à distance', () => {
  assert.equal(areAdjacent(0, 0, 0, 1), true);
  assert.equal(areAdjacent(0, 0, 1, 1), true);
  assert.equal(areAdjacent(0, 0, 0, 0), false);
  assert.equal(areAdjacent(0, 0, 0, 2), false);
});

test('solution valide acceptée, variantes fautives refusées', () => {
  assert.equal(isValidSolution(P, P.solution), true);
  assert.equal(isValidSolution(P, [3, 0, 2, 4, 4]), false, 'colonne répétée');
  assert.equal(isValidSolution(P, [3, 2, 0, 4, 1]), false, 'contact diagonal');
  assert.equal(isValidSolution(P, [1, 3, 0, 4, 2]), false, 'alpage répété');
  assert.equal(isValidSolution(P, [3, 0, 2, 4]), false, 'ligne manquante');
});

test('conflits : marmottes en contact et sur la même ligne', () => {
  const cells = new Array(25).fill(EMPTY);
  cells[0] = MARMOT; // (0,0)
  cells[6] = MARMOT; // (1,1) touche (0,0)
  cells[13] = MARMOT; // (2,3)
  cells[14] = MARMOT; // (2,4) même ligne que (2,3)
  cells[22] = MARMOT; // (4,2) isolée
  assert.deepEqual(findConflicts(P, cells), [0, 6, 13, 14]);
});

test('résolu seulement avec exactement les marmottes de la solution', () => {
  const cells = new Array(25).fill(EMPTY);
  assert.equal(isSolved(P, cells), false);
  P.solution.forEach((col, row) => { cells[row * 5 + col] = MARMOT; });
  cells[1] = CROSS; // les croix n'empêchent pas la victoire
  assert.equal(isSolved(P, cells), true);
  cells[20] = MARMOT; // une marmotte de trop
  assert.equal(isSolved(P, cells), false);
});
