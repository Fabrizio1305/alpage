// Interface de jeu : plateau, interactions, sifflets, chrono, réglages, tutoriel, sauvegarde.
// Aucune donnée ne sort du téléphone : tout tourne dans cette page.

import {
  EMPTY, CROSS, MARMOT, MIN_SIZE, MAX_SIZE,
  generatePuzzle, dailyPuzzle, dateKey, isSolved, findConflicts, cellsCoveredBy,
} from '../engine/index.js';
import {
  chargerPartie, sauvegarderPartie, chargerStats, enregistrerVictoire, serieCourante,
  chargerReglages, sauvegarderReglages,
} from './storage.js';

const SIFFLETS_MAX = 3;

const $ = (id) => document.getElementById(id);
const plateau = $('plateau');
const sifflets = $('sifflets');
const chrono = $('chrono');
const voile = $('voile');
const taille = $('taille');
const stats = $('stats');

let reglages = chargerReglages();

const jeu = {
  puzzle: null,
  mode: 'jour',      // 'jour' ou 'libre'
  cleJour: null,     // date du puzzle du jour, null en partie libre
  zen: false,        // sans sifflets, conflits surlignés
  cells: [],         // EMPTY / CROSS / MARMOT
  manuel: [],        // true si la croix a été posée par le joueur
  auto: [],          // nombre de marmottes qui interdisent la case
  rendu: [],         // dernier état dessiné par case (évite de redessiner pour rien)
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

function installer(partie) {
  arreterChrono();
  Object.assign(jeu, partie, { fini: false, demarre: null, minuteur: null });
  const n = jeu.puzzle.size ** 2;
  if (jeu.manuel.length !== n) jeu.manuel = new Array(n).fill(false);
  voile.hidden = true;
  construirePlateau();
  recalculerAuto();
  rendreTout();
  rendreSifflets();
  rendreChrono();
  rendreStats();
}

function nouvellePartie(puzzle, mode, cleJour = null) {
  const n = puzzle.size ** 2;
  installer({
    puzzle, mode, cleJour, zen: reglages.zen,
    cells: new Array(n).fill(EMPTY), manuel: new Array(n).fill(false),
    sifflets: SIFFLETS_MAX, ecoule: 0,
  });
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
  installer({
    puzzle: s.puzzle, mode: s.mode, cleJour: s.cleJour ?? null, zen: !!s.zen,
    cells: s.cells, manuel: s.manuel ?? [], sifflets: s.sifflets, ecoule: s.ecoule ?? 0,
  });
  return true;
}

function sauvegarder() {
  sauvegarderPartie({
    puzzle: jeu.puzzle, mode: jeu.mode, cleJour: jeu.cleJour, zen: jeu.zen, cells: jeu.cells,
    manuel: jeu.manuel, sifflets: jeu.sifflets, fini: jeu.fini, ecoule: tempsEcoule(),
  });
}

// ---------- Plateau ----------

function construirePlateau() {
  const { size, regions } = jeu.puzzle;
  plateau.style.setProperty('--n', size);
  plateau.classList.remove('fini');
  plateau.replaceChildren();
  jeu.rendu = new Array(size * size).fill('');
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size), col = i % size;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `case m${regions[i] % 10}`;
    b.style.setProperty('--couleur', `var(--r${regions[i] % 10})`);
    if (row > 0 && regions[i - size] !== regions[i]) b.classList.add('bt');
    if (col > 0 && regions[i - 1] !== regions[i]) b.classList.add('bl');
    b.addEventListener('click', () => toucher(i));
    plateau.appendChild(b);
  }
}

function rendreCase(i) {
  const etat = jeu.cells[i];
  const cle = `${etat}${etat === CROSS && !jeu.manuel[i] ? 'a' : ''}`;
  if (jeu.rendu[i] === cle) return;
  jeu.rendu[i] = cle;
  const b = plateau.children[i];
  const { size, regions } = jeu.puzzle;
  b.replaceChildren();
  if (etat === CROSS) {
    const s = document.createElement('span');
    s.className = jeu.manuel[i] ? 'croix' : 'croix auto';
    s.textContent = '✕';
    b.appendChild(s);
  } else if (etat === MARMOT) {
    b.insertAdjacentHTML('beforeend', '<svg class="marmot"><use href="#marmotte"/></svg>');
  }
  if (etat !== MARMOT) b.classList.remove('pose');
  const contenu = etat === CROSS ? 'croix' : etat === MARMOT ? 'marmotte' : 'vide';
  b.setAttribute('aria-label', `Ligne ${Math.floor(i / size) + 1}, colonne ${i % size + 1}, alpage ${regions[i] + 1}, ${contenu}`);
}

function rendreTout() {
  for (let i = 0; i < jeu.cells.length; i++) rendreCase(i);
  const conflits = new Set(jeu.zen ? findConflicts(jeu.puzzle, jeu.cells) : []);
  for (let i = 0; i < jeu.cells.length; i++) plateau.children[i].classList.toggle('conflit', conflits.has(i));
}

/** Croix automatiques : recalculées depuis zéro à partir des marmottes posées. */
function recalculerAuto() {
  const n = jeu.cells.length;
  jeu.auto = new Array(n).fill(0);
  if (reglages.autoCroix) {
    for (let i = 0; i < n; i++) {
      if (jeu.cells[i] !== MARMOT) continue;
      for (const j of cellsCoveredBy(jeu.puzzle, i)) jeu.auto[j]++;
    }
  }
  for (let j = 0; j < n; j++) {
    if (jeu.cells[j] === MARMOT) continue;
    if (jeu.auto[j] > 0 && jeu.cells[j] === EMPTY) jeu.cells[j] = CROSS;
    else if (jeu.auto[j] === 0 && jeu.cells[j] === CROSS && !jeu.manuel[j]) jeu.cells[j] = EMPTY;
  }
}

// ---------- Interactions ----------

function toucher(i) {
  if (jeu.fini) return;
  demarrerChrono();
  const b = plateau.children[i];
  const etat = jeu.cells[i];
  if (etat === EMPTY) {
    jeu.cells[i] = CROSS;
    jeu.manuel[i] = true;
  } else if (etat === CROSS) {
    const { size, solution } = jeu.puzzle;
    const bonne = solution[Math.floor(i / size)] === i % size;
    if (bonne || jeu.zen) {
      jeu.cells[i] = MARMOT;
      jeu.manuel[i] = false;
      b.classList.add('pose');
      navigator.vibrate?.(15);
    } else {
      perdreSifflet(b);
      return;
    }
  } else {
    jeu.cells[i] = EMPTY;
    jeu.manuel[i] = false;
  }
  recalculerAuto();
  rendreTout();
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
  sifflets.hidden = jeu.zen;
  $('badge-zen').hidden = !jeu.zen;
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

// ---------- Réglages ----------

function appliquerReglages() {
  document.body.classList.toggle('motifs', reglages.motifs);
  $('reg-autoCroix').checked = reglages.autoCroix;
  $('reg-zen').checked = reglages.zen;
  $('reg-motifs').checked = reglages.motifs;
}

function changerReglage(cle, valeur) {
  reglages = { ...reglages, [cle]: valeur };
  sauvegarderReglages(reglages);
  appliquerReglages();
  if (cle === 'autoCroix' && jeu.puzzle && !jeu.fini) {
    recalculerAuto();
    rendreTout();
    sauvegarder();
  }
}

// ---------- Tutoriel ----------

const etapes = [...document.querySelectorAll('#tuto .etape')];
let etape = 0;

function montrerEtape(k) {
  etape = Math.max(0, Math.min(etapes.length - 1, k));
  etapes.forEach((e, i) => { e.hidden = i !== etape; });
  $('tuto-points').replaceChildren(...etapes.map((_, i) => {
    const s = document.createElement('span');
    if (i === etape) s.className = 'actif';
    return s;
  }));
  $('tuto-prec').hidden = etape === 0;
  $('tuto-suiv').textContent = etape === etapes.length - 1 ? 'Jouer' : 'Suivant';
}

function ouvrirTuto() {
  montrerEtape(0);
  $('tuto').hidden = false;
}

function fermerTuto() {
  $('tuto').hidden = true;
  if (!reglages.tutoVu) changerReglage('tutoVu', true);
}

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
$('btn-reglages').addEventListener('click', () => { $('reglages').hidden = false; });
$('btn-reglages-fermer').addEventListener('click', () => { $('reglages').hidden = true; });
for (const cle of ['autoCroix', 'zen', 'motifs']) {
  $(`reg-${cle}`).addEventListener('change', (e) => changerReglage(cle, e.target.checked));
}
$('btn-aide').addEventListener('click', ouvrirTuto);
$('tuto-prec').addEventListener('click', () => montrerEtape(etape - 1));
$('tuto-suiv').addEventListener('click', () => (etape === etapes.length - 1 ? fermerTuto() : montrerEtape(etape + 1)));

appliquerReglages();
if (!reprendre()) partieDuJour();
if (!reglages.tutoVu) ouvrirTuto();

// Hors ligne : le service worker garde une copie du jeu dans le téléphone.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
