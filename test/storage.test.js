import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage simulé pour Node.
const memoire = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
};

const { enregistrerVictoire, chargerStats, serieCourante, sauvegarderPartie, chargerPartie } = await import('../src/ui/storage.js');

test('série quotidienne : jours consécutifs, doublon ignoré, trou remis à 1', () => {
  memoire.clear();
  enregistrerVictoire({ size: 7, temps: 90000, cleJour: '2026-09-24' });
  enregistrerVictoire({ size: 7, temps: 80000, cleJour: '2026-09-25' });
  enregistrerVictoire({ size: 7, temps: 70000, cleJour: '2026-09-25' }); // même jour
  let s = chargerStats();
  assert.equal(s.jour.serie, 2);
  assert.equal(s.reussis, 2);
  assert.equal(s.meilleurs[7], 80000);
  assert.equal(serieCourante(s, '2026-09-26'), 2, 'hier réussi : série visible');
  assert.equal(serieCourante(s, '2026-09-27'), 0, 'un jour manqué : série à zéro');
  enregistrerVictoire({ size: 7, temps: 60000, cleJour: '2026-09-28' });
  s = chargerStats();
  assert.equal(s.jour.serie, 1);
});

test('partie libre : compte les réussites et le record sans toucher la série', () => {
  memoire.clear();
  enregistrerVictoire({ size: 5, temps: 30000, cleJour: null });
  enregistrerVictoire({ size: 5, temps: 45000, cleJour: null });
  const s = chargerStats();
  assert.equal(s.reussis, 2);
  assert.equal(s.meilleurs[5], 30000);
  assert.equal(s.jour.serie, 0);
});

test('partie en cours : aller-retour et stockage cassé toléré', () => {
  memoire.clear();
  sauvegarderPartie({ mode: 'libre', cells: [0, 1] });
  assert.deepEqual(chargerPartie(), { mode: 'libre', cells: [0, 1] });
  memoire.set('alpage.partie', '{pas du json');
  assert.equal(chargerPartie(), null);
});

test('réglages : valeurs par défaut complétées, puis conservées', async () => {
  const { chargerReglages, sauvegarderReglages } = await import('../src/ui/storage.js');
  memoire.clear();
  assert.deepEqual(chargerReglages(), { autoCroix: false, zen: false, motifs: false, tutoVu: false, v: 2 });
  sauvegarderReglages({ zen: true, v: 2 });
  assert.deepEqual(chargerReglages(), { autoCroix: false, zen: true, motifs: false, tutoVu: false, v: 2 });
  sauvegarderReglages({ autoCroix: true, v: 2 });
  assert.equal(chargerReglages().autoCroix, true, 'choix explicite conservé');
  sauvegarderReglages({ autoCroix: true, tutoVu: true }); // enregistré par la v1
  assert.deepEqual(chargerReglages(), { autoCroix: false, zen: false, motifs: false, tutoVu: true, v: 2 }, 'migration v1 → défaut désactivé');
});
