import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const fichiers = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);

test('chaque fichier listé dans le service worker existe', () => {
  assert.ok(fichiers.length >= 10);
  for (const f of fichiers) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `manquant : ${f}`);
});

test('tous les modules et feuilles de style du jeu sont listés dans le service worker', () => {
  const sources = execSync('git ls-files src index.html manifest.json icons', { cwd: new URL('..', import.meta.url) })
    .toString().trim().split('\n');
  for (const f of sources) assert.ok(fichiers.includes(f), `oublié dans sw.js : ${f}`);
});

test('la version du cache change quand les fichiers servis changent (rappel)', () => {
  assert.match(sw, /const CACHE = 'alpage-v\d+'/);
});
