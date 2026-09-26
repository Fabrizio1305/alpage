import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', racine), 'utf8');
const listes = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);

function fichiersDe(dossier) {
  return readdirSync(new URL(dossier, racine), { recursive: true })
    .map((f) => `${dossier}/${f}`)
    .filter((f) => statSync(new URL(f, racine)).isFile());
}

test('chaque fichier listé dans le service worker existe', () => {
  assert.ok(listes.length >= 10);
  for (const f of listes) assert.ok(existsSync(new URL(f, racine)), `manquant : ${f}`);
});

test('tous les fichiers servis sont listés dans le service worker, même non commités', () => {
  const servis = [...fichiersDe('src'), ...fichiersDe('icons'), 'index.html', 'manifest.json'];
  for (const f of servis) assert.ok(listes.includes(f), `oublié dans sw.js : ${f}`);
});

test('le service worker contourne le cache HTTP et porte un numéro de version', () => {
  assert.match(sw, /const CACHE = 'alpage-v\d+'/);
  assert.match(sw, /cache: 'reload'/);
});
