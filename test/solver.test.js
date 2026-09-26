import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, solve } from '../src/engine/solver.js';

const UNIQUE = {
  size: 5,
  regions: [
    1, 0, 0, 0, 0,
    1, 1, 1, 3, 0,
    4, 2, 2, 3, 3,
    4, 4, 4, 3, 3,
    4, 4, 4, 4, 4,
  ],
};

// Alpages en bandes horizontales : la contrainte d'alpage devient inutile → plusieurs solutions.
const MULTI = {
  size: 5,
  regions: [
    0, 0, 0, 0, 0,
    1, 1, 1, 1, 1,
    2, 2, 2, 2, 2,
    3, 3, 3, 3, 3,
    4, 4, 4, 4, 4,
  ],
};

test('le puzzle témoin a exactement une solution', () => {
  assert.equal(countSolutions(UNIQUE, 2), 1);
  assert.deepEqual(solve(UNIQUE), [3, 0, 2, 4, 1]);
});

test('les bandes horizontales ont plusieurs solutions', () => {
  assert.equal(countSolutions(MULTI, 2), 2);
  assert.ok(countSolutions(MULTI, 1000) > 2);
});

test('un puzzle impossible n\'a aucune solution', () => {
  // Les alpages 0 et 1 sont deux cases seules qui se touchent en diagonale.
  const impossible = {
    size: 5,
    regions: [
      0, 2, 2, 2, 2,
      2, 1, 2, 2, 2,
      2, 2, 2, 2, 2,
      3, 3, 3, 3, 3,
      4, 4, 4, 4, 4,
    ],
  };
  assert.equal(countSolutions(impossible, 2), 0);
  assert.equal(solve(impossible), null);
});
