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

test('mode zen : compte pour la série et les réussites, pas pour les records', () => {
  memoire.clear();
  enregistrerVictoire({ size: 6, temps: 50000, cleJour: '2026-09-26', zen: true });
  let s = chargerStats();
  assert.equal(s.reussis, 1);
  assert.equal(s.jour.serie, 1);
  assert.equal(s.meilleurs[6], undefined);
  enregistrerVictoire({ size: 6, temps: 90000, cleJour: null });
  s = chargerStats();
  assert.equal(s.meilleurs[6], 90000, 'le premier record hors zen est retenu');
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
  const defaut = { autoCroix: false, zen: false, motifs: false, tutoVu: false, langue: 'auto', taille: 7, niveau: 'moyen', v: 2 };
  assert.deepEqual(chargerReglages(), defaut);
  sauvegarderReglages({ zen: true, v: 2 });
  assert.deepEqual(chargerReglages(), { ...defaut, zen: true });
  sauvegarderReglages({ autoCroix: true, v: 2 });
  assert.equal(chargerReglages().autoCroix, true, 'choix explicite conservé');
  sauvegarderReglages({ autoCroix: true, tutoVu: true }); // enregistré par la v1
  assert.deepEqual(chargerReglages(), { ...defaut, tutoVu: true }, 'migration v1 → défaut désactivé');
  sauvegarderReglages({ taille: 9, niveau: 'expert', v: 2 });
  assert.equal(chargerReglages().taille, 9);
  assert.equal(chargerReglages().niveau, 'expert');
  sauvegarderReglages({ taille: 42, niveau: 'impossible', v: 2 });
  assert.equal(chargerReglages().taille, 7, 'taille inconnue → défaut');
  assert.equal(chargerReglages().niveau, 'moyen', 'niveau inconnu → défaut');
});

test('records : un par taille et par niveau', async () => {
  const { cleRecord } = await import('../src/ui/storage.js');
  memoire.clear();
  enregistrerVictoire({ size: 8, niveau: 'facile', temps: 60000, cleJour: null });
  enregistrerVictoire({ size: 8, niveau: 'expert', temps: 300000, cleJour: null });
  enregistrerVictoire({ size: 8, niveau: 'expert', temps: 400000, cleJour: null });
  const s = chargerStats();
  assert.equal(s.meilleurs[cleRecord(8, 'facile')], 60000);
  assert.equal(s.meilleurs[cleRecord(8, 'expert')], 300000, 'un expert lent ne bat pas un facile rapide, ni l\'inverse');
  assert.equal(cleRecord(8, null), '8', 'puzzle sans niveau : la taille seule');
});
