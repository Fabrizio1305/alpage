import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resoudreParDeduction, niveauDe, NIVEAUX } from '../src/engine/logic.js';
import { generatePuzzle } from '../src/engine/generator.js';
import { countSolutions } from '../src/engine/solver.js';
import { dailyPuzzle, dailyNiveau } from '../src/engine/daily.js';

// Vérifié à la main : l'alpage 3 est une case seule, puis chaque marmotte laisse une
// ligne ou un alpage avec une seule case possible.
const FACILE = {
  size: 5,
  regions: [
    1, 0, 0, 1, 2,
    1, 1, 1, 1, 2,
    1, 1, 1, 2, 2,
    4, 3, 4, 2, 2,
    4, 4, 4, 4, 2,
  ],
  solution: [2, 0, 4, 1, 3],
};

// Vérifié à la main : après les déductions simples, il faut voir que l'alpage 2 et la
// ligne 5 occupent à elles deux les colonnes 2 et 3 (enfermement multiple).
const DIFFICILE = {
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

// Bandes horizontales : plusieurs solutions, aucune déduction ne peut trancher.
const BANDES = {
  size: 5,
  regions: [
    0, 0, 0, 0, 0,
    1, 1, 1, 1, 1,
    2, 2, 2, 2, 2,
    3, 3, 3, 3, 3,
    4, 4, 4, 4, 4,
  ],
};

test('puzzle facile : uniquement des dernières places', () => {
  const r = resoudreParDeduction(FACILE);
  assert.equal(r.resolu, true);
  assert.deepEqual(r.solution, FACILE.solution);
  assert.equal(r.niveau, 1);
  assert.equal(niveauDe(FACILE), 'facile');
});

test('puzzle difficile : un enfermement multiple, et rien de plus dur', () => {
  const r = resoudreParDeduction(DIFFICILE);
  assert.equal(r.resolu, true);
  assert.deepEqual(r.solution, DIFFICILE.solution);
  assert.equal(r.niveau, 3);
  assert.equal(r.etapes[3], 1);
  assert.equal(niveauDe(DIFFICILE), 'difficile');
});

test('puzzle à plusieurs solutions : pas résolu par déduction', () => {
  const r = resoudreParDeduction(BANDES);
  assert.equal(r.resolu, false);
  assert.equal(niveauDe(BANDES), null);
});

for (const niveau of NIVEAUX) {
  test(`générateur, niveau ${niveau} : niveau exact, unique, résolu sans deviner`, () => {
    for (let size = 5; size <= 10; size++) {
      for (const seed of [11, 12]) {
        const p = generatePuzzle(size, seed, niveau);
        assert.equal(p.niveau, niveau, `taille ${size}, graine ${seed}`);
        assert.equal(countSolutions(p, 2), 1);
        const r = resoudreParDeduction(p);
        assert.equal(NIVEAUX[r.niveau - 1], niveau);
        assert.deepEqual(r.solution, p.solution, 'les déductions mènent à la vraie solution');
      }
    }
  });
}

test('générateur : même graine et même niveau → même puzzle ; niveau inconnu refusé', () => {
  assert.deepEqual(generatePuzzle(8, 42, 'expert'), generatePuzzle(8, 42, 'expert'));
  assert.throws(() => generatePuzzle(8, 42, 'impossible'), RangeError);
});

test('puzzle du jour : niveau selon le jour, du lundi moyen au dimanche expert', () => {
  assert.equal(dailyNiveau('2026-09-21'), 'moyen', 'lundi');
  assert.equal(dailyNiveau('2026-09-23'), 'difficile', 'mercredi');
  assert.equal(dailyNiveau('2026-09-27'), 'expert', 'dimanche');
  assert.equal(dailyPuzzle('2026-09-27').niveau, 'expert');
});
