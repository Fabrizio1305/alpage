// Interface de jeu : rendu du plateau, interactions, sifflets, chrono, sauvegarde locale.
// Aucune donnée ne sort du téléphone : tout tourne dans cette page.

import {
  EMPTY, CROSS, MARMOT, MIN_SIZE, MAX_SIZE,
  generatePuzzle, dailyPuzzle, dateKey, isSolved,
} from '../engine/index.js';
import { chargerPartie, sauvegarderPartie, chargerStats, enregistrerVictoire, serieCourante } from './storage.js';

const SIFFLETS_MAX = 3;

const $ = (id) => document.getElementById(id);
const plateau = $('plateau');
const sifflets = $('sifflets');
const chrono = $('chrono');
const voile = $('voile');
const taille = $('taille');
const stats = $('stats');

const jeu = {
  puzzle: null,
  mode: 'jour',      // 'jour' ou 'libre'
  cleJour: null,     // date du puzzle du jour, null en partie libre
  cells: [],
  sifflets: SIFFLETS_MAX,
  fini: false,
  demarre: null,     // horodatage du premier geste
  ecoule: 0,         // ms cumulés avant la dernière pause
  minuteur: null,
};

// ---------- Parties ----------

function graineAleatoire() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function nouvellePartie(puzzle, mode, cleJour = null) {
  arreterChrono();
  jeu.puzzle = puzzle;
  jeu.mode = mode;
  jeu.cleJour = cleJour;
  jeu.cells = new Array(puzzle.size * puzzle.size).fill(EMPTY);
  jeu.sifflets = SIFFLETS_MAX;
  jeu.fini = false;
  jeu.demarre = null;
  jeu.ecoule = 0;
  voile.hidden = true;
  construirePlateau();
  rendreSifflets();
  rendreChrono();
  rendreStats();
  sauvegarder();
}

function partieDuJour() {
  const cle = dateKey();
  nouvellePartie(dailyPuzzle(cle), 'jour', cle);
}

function partieLibre() {
  nouvellePartie(generatePuzzle(Number(taille.value), graineAleatoire()), 'libre');
}

function rejouer() {
  nouvellePartie(jeu.puzzle, jeu.mode, jeu.cleJour);
}

/** Reprend une partie sauvegardée non terminée. Renvoie false si rien à reprendre. */
function reprendre() {
  const s = chargerPartie();
  if (!s || s.fini || !s.puzzle || !Array.isArray(s.cells)) return false;
  if (s.mode === 'jour' && s.cleJour !== dateKey()) return false; // le puzzle du jour a changé
  arreterChrono();
  Object.assign(jeu, {
    puzzle: s.puzzle, mode: s.mode, cleJour: s.cleJour ?? null, cells: s.cells,
    sifflets: s.sifflets, fini: false, demarre: null, ecoule: s.ecoule ?? 0,
  });
  voile.hidden = true;
  construirePlateau();
  rendreSifflets();
  rendreChrono();
  rendreStats();
  return true;
}

function sauvegarder() {
  sauvegarderPartie({
    puzzle: jeu.puzzle, mode: jeu.mode, cleJour: jeu.cleJour, cells: jeu.cells,
    sifflets: jeu.sifflets, fini: jeu.fini, ecoule: tempsEcoule(),
  });
}

// ---------- Plateau ----------

function construirePlateau() {
  const { size, regions } = jeu.puzzle;
  plateau.style.setProperty('--n', size);
  plateau.classList.remove('fini');
  plateau.replaceChildren();
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size), col = i % size;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'case';
    b.style.setProperty('--couleur', `var(--r${regions[i] % 10})`);
    if (row > 0 && regions[i - size] !== regions[i]) b.classList.add('bt');
    if (col > 0 && regions[i - 1] !== regions[i]) b.classList.add('bl');
    b.addEventListener('click', () => toucher(i));
    plateau.appendChild(b);
    rendreCase(i);
  }
}

function rendreCase(i) {
  const b = plateau.children[i];
  const { size, regions } = jeu.puzzle;
  const etat = jeu.cells[i];
  b.replaceChildren();
  if (etat === CROSS) {
    const s = document.createElement('span');
    s.className = 'croix';
    s.textContent = '✕';
    b.appendChild(s);
  } else if (etat === MARMOT) {
    b.insertAdjacentHTML('beforeend', '<svg class="marmot"><use href="#marmotte"/></svg>');
  }
  const contenu = etat === CROSS ? 'croix' : etat === MARMOT ? 'marmotte' : 'vide';
  b.setAttribute('aria-label', `Ligne ${Math.floor(i / size) + 1}, colonne ${i % size + 1}, alpage ${regions[i] + 1}, ${contenu}`);
}

// ---------- Interactions ----------

function toucher(i) {
  if (jeu.fini) return;
  demarrerChrono();
  const b = plateau.children[i];
  const etat = jeu.cells[i];
  if (etat === EMPTY) {
    jeu.cells[i] = CROSS;
  } else if (etat === CROSS) {
    const { size, solution } = jeu.puzzle;
    if (solution[Math.floor(i / size)] === i % size) {
      jeu.cells[i] = MARMOT;
      b.classList.add('pose');
      navigator.vibrate?.(15);
    } else {
      perdreSifflet(b);
      return;
    }
  } else {
    jeu.cells[i] = EMPTY;
    b.classList.remove('pose');
  }
  rendreCase(i);
  if (isSolved(jeu.puzzle, jeu.cells)) gagner();
  else sauvegarder();
}

function perdreSifflet(b) {
  jeu.sifflets--;
  rendreSifflets();
  b.classList.remove('erreur');
  void b.offsetWidth; // relance l'animation
  b.classList.add('erreur');
  navigator.vibrate?.([60, 40, 60]);
  if (jeu.sifflets === 0) perdre();
  else sauvegarder();
}

function gagner() {
  jeu.fini = true;
  arreterChrono();
  plateau.classList.add('fini');
  navigator.vibrate?.([30, 30, 30, 30, 80]);
  const temps = tempsEcoule();
  const avant = chargerStats().meilleurs[jeu.puzzle.size];
  enregistrerVictoire({ size: jeu.puzzle.size, temps, cleJour: jeu.cleJour });
  rendreStats();
  sauvegarder();
  const record = !avant || temps < avant ? ' Nouveau record pour cette taille !' : '';
  afficherVoile('Alpage en paix !', `Toutes les marmottes ont leur territoire en ${formaterTemps(temps)}.${record}`, false);
}

function perdre() {
  jeu.fini = true;
  arreterChrono();
  plateau.classList.add('fini');
  sauvegarder();
  afficherVoile('Les marmottes ont fui', 'Trois sifflets d’alerte : trop de dérangements. Réessayez ce puzzle ou lancez-en un autre.', true);
}

function afficherVoile(titre, texte, rejouable) {
  $('voile-titre').textContent = titre;
  $('voile-texte').textContent = texte;
  $('btn-rejouer').hidden = !rejouable;
  voile.hidden = false;
}

// ---------- Sifflets, chrono, statistiques ----------

function rendreSifflets() {
  sifflets.replaceChildren();
  for (let k = 0; k < SIFFLETS_MAX; k++) {
    sifflets.insertAdjacentHTML('beforeend', `<svg class="${k < jeu.sifflets ? '' : 'perdu'}"><use href="#sifflet"/></svg>`);
  }
  sifflets.setAttribute('aria-label', `${jeu.sifflets} sifflet${jeu.sifflets > 1 ? 's' : ''} sur ${SIFFLETS_MAX}`);
}

function rendreStats() {
  const s = chargerStats();
  const serie = serieCourante(s, dateKey());
  const meilleur = s.meilleurs[jeu.puzzle.size];
  const parts = [`Série : ${serie} jour${serie > 1 ? 's' : ''}`, `Réussis : ${s.reussis}`];
  if (meilleur) parts.push(`Record ${jeu.puzzle.size}×${jeu.puzzle.size} : ${formaterTemps(meilleur)}`);
  stats.textContent = parts.join(' · ');
}

function tempsEcoule() {
  return jeu.ecoule + (jeu.demarre ? Date.now() - jeu.demarre : 0);
}

function formaterTemps(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function rendreChrono() {
  chrono.textContent = formaterTemps(tempsEcoule());
}

function demarrerChrono() {
  if (jeu.demarre || jeu.fini) return;
  jeu.demarre = Date.now();
  jeu.minuteur = setInterval(rendreChrono, 500);
}

function arreterChrono() {
  if (jeu.demarre) {
    jeu.ecoule += Date.now() - jeu.demarre;
    jeu.demarre = null;
  }
  clearInterval(jeu.minuteur);
  jeu.minuteur = null;
  rendreChrono();
}

// Le chrono s'arrête quand l'app passe en arrière-plan, et repart au premier geste.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && jeu.puzzle) {
    arreterChrono();
    sauvegarder();
  }
});

// ---------- Démarrage ----------

for (let n = MIN_SIZE; n <= MAX_SIZE; n++) {
  const o = document.createElement('option');
  o.value = n;
  o.textContent = `${n} × ${n}`;
  taille.appendChild(o);
}
taille.value = 7;

$('btn-jour').addEventListener('click', partieDuJour);
$('btn-libre').addEventListener('click', partieLibre);
$('btn-rejouer').addEventListener('click', rejouer);
$('btn-nouveau').addEventListener('click', partieLibre);
$('btn-jour').classList.add('principal');

if (!reprendre()) partieDuJour();

// Hors ligne : le service worker garde une copie du jeu dans le téléphone.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
