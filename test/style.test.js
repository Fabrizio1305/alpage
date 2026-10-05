import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_SIZE } from '../src/engine/rules.js';

const racine = new URL('../', import.meta.url);
const css = readFileSync(new URL('src/ui/style.css', racine), 'utf8');
const app = readFileSync(new URL('src/ui/app.js', racine), 'utf8');

test('une couleur (thèmes clair et sombre) et un motif par alpage, jusqu\'à la plus grande grille', () => {
  assert.ok(Number(app.match(/const NB_COULEURS = (\d+)/)[1]) >= MAX_SIZE, 'NB_COULEURS dans app.js');
  for (let k = 0; k < MAX_SIZE; k++) {
    const couleurs = css.match(new RegExp(`--r${k}: #[0-9a-f]{6}`, 'g')) ?? [];
    assert.equal(couleurs.length, 2, `--r${k} en clair et en sombre`);
    if (k > 0) assert.match(css, new RegExp(`\\.motifs \\.case\\.m${k} \\{`), `motif .m${k}`);
  }
  const clairs = [...css.matchAll(/--r\d+: (#[0-9a-f]{6})/g)].map((m) => m[1]);
  assert.equal(new Set(clairs).size, clairs.length, 'toutes les couleurs sont différentes');
});
