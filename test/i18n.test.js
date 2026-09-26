import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGUES, NOMS_LANGUES, choisirLangue, definirLangue, t, _TEXTES } from '../src/ui/i18n.js';

const racine = new URL('../', import.meta.url);
const cles = Object.keys(_TEXTES.fr);
// Arguments d'exemple pour les textes à paramètres (nombre = arité de la fonction).
const EXEMPLES = { 1: [2], 2: [1, 3], 4: [1, 2, 3, 'vide'] };

test('les cinq langues ont exactement les mêmes clés que le français', () => {
  assert.deepEqual(Object.keys(_TEXTES).sort(), [...LANGUES].sort());
  for (const l of LANGUES) {
    assert.deepEqual(Object.keys(_TEXTES[l]).sort(), [...cles].sort(), `clés de ${l}`);
    assert.ok(NOMS_LANGUES[l], `nom de ${l}`);
  }
});

test('aucun texte vide ; textes à paramètres cohérents entre langues', () => {
  for (const l of LANGUES) {
    for (const k of cles) {
      const v = _TEXTES[l][k];
      const ref = _TEXTES.fr[k];
      assert.equal(typeof v, typeof ref, `${l}.${k} : même type qu'en français`);
      if (typeof v === 'function') {
        assert.equal(v.length, ref.length, `${l}.${k} : même nombre de paramètres`);
        const texte = v(...EXEMPLES[v.length]);
        assert.ok(texte.trim() && !texte.includes('undefined'), `${l}.${k} rendu : « ${texte} »`);
      } else {
        assert.ok(v.trim(), `${l}.${k} vide`);
      }
    }
  }
});

test('allemand suisse : jamais de « ß »', () => {
  for (const [k, v] of Object.entries(_TEXTES.de)) {
    const texte = typeof v === 'function' ? v(...EXEMPLES[v.length]) : v;
    assert.ok(!texte.includes('ß'), `de.${k} contient ß`);
  }
});

test('choix de la langue : réglage, puis téléphone, puis anglais', () => {
  assert.equal(choisirLangue('it', ['de-CH']), 'it');
  assert.equal(choisirLangue('auto', ['de-CH', 'fr']), 'de');
  assert.equal(choisirLangue('auto', ['rm-CH']), 'rm');
  assert.equal(choisirLangue('auto', ['es-ES', 'fr-CH']), 'fr');
  assert.equal(choisirLangue('auto', ['es-ES', 'pt']), 'en');
  assert.equal(choisirLangue(undefined, []), 'en');
});

test('traduction : pluriels et repli sur la clé inconnue', () => {
  definirLangue('fr');
  assert.equal(t('serie', 1), 'Série : 1 jour');
  assert.equal(t('serie', 3), 'Série : 3 jours');
  definirLangue('de');
  assert.equal(t('serie', 1), 'Serie: 1 Tag');
  definirLangue('en');
  assert.equal(t('cleInconnue'), 'cleInconnue');
  definirLangue('fr');
});

test('toutes les clés utilisées par la page et le script existent', () => {
  const html = readFileSync(new URL('index.html', racine), 'utf8');
  const app = readFileSync(new URL('src/ui/app.js', racine), 'utf8');
  const utilisees = new Set([
    ...[...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/\bt\('([^']+)'/g)].map((m) => m[1]),
  ]);
  assert.ok(utilisees.size > 30);
  for (const k of utilisees) assert.ok(cles.includes(k), `clé absente : ${k}`);
});
