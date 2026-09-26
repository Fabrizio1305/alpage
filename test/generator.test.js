import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle } from '../src/engine/generator.js';
import { countSolutions } from '../src/engine/solver.js';
import { isValidSolution, MIN_SIZE, MAX_SIZE } from '../src/engine/rules.js';
import { dailyPuzzle, dailySeed, dailySize, dateKey } from '../src/engine/daily.js';

/** Chaque alpage est-il d'un seul tenant (voisinage de côté) ? */
function regionsAreConnected(size, regions) {
  for (let reg = 0; reg < size; reg++) {
    const cells = [];
    for (let i = 0; i < regions.length; i++) if (regions[i] === reg) cells.push(i);
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const i = stack.pop();
      const r = Math.floor(i / size), c = i % size;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const n = nr * size + nc;
        if (regions[n] === reg && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

for (let size = MIN_SIZE; size <= MAX_SIZE; size++) {
  test(`taille ${size} : solution unique, alpages connexes, ${size} alpages`, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = generatePuzzle(size, seed);
      assert.equal(p.regions.length, size * size);
      assert.equal(new Set(p.regions).size, size);
      assert.ok(isValidSolution(p, p.solution));
      assert.equal(countSolutions(p, 2), 1);
      assert.ok(regionsAreConnected(size, p.regions));
    }
  });
}

test('même graine → même puzzle ; graines différentes → puzzles différents', () => {
  const a = generatePuzzle(7, 42);
  const b = generatePuzzle(7, 42);
  const c = generatePuzzle(7, 43);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.regions, c.regions);
});

test('taille hors bornes refusée', () => {
  assert.throws(() => generatePuzzle(4, 1), RangeError);
  assert.throws(() => generatePuzzle(11, 1), RangeError);
});

test('puzzle du jour : clé de date, graine stable, taille selon le jour', () => {
  assert.equal(dateKey(new Date(2026, 8, 26)), '2026-09-26');
  assert.equal(dailySeed('2026-09-26'), dailySeed('2026-09-26'));
  assert.notEqual(dailySeed('2026-09-26'), dailySeed('2026-09-27'));
  assert.equal(dailySize('2026-09-21'), 6, 'lundi');
  assert.equal(dailySize('2026-09-27'), 9, 'dimanche');
  const p = dailyPuzzle('2026-09-26');
  assert.equal(p.size, dailySize('2026-09-26'));
  assert.equal(countSolutions(p, 2), 1);
});
