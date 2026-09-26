// Interface de jeu : dessine l'état d'une partie (src/engine/game.js) et relaie les gestes.
// Aucune donnée ne sort du téléphone : tout tourne dans cette page.

import {
  EMPTY, CROSS, MARMOT, MIN_SIZE, MAX_SIZE, dateKey, puzzleFor,
  SIFFLETS_MAX, createGame, restoreGame, saveableGame, tap, updateAutoCrosses, conflicts,
} from '../engine/index.js';
import {
  chargerPartie, sauvegarderPartie, chargerStats, enregistrerVictoire, serieCourante,
  chargerReglages, sauvegarderReglages,
} from './storage.js';

const $ = (id) => document.getElementById(id);
const plateau = $('plateau');
const sifflets = $('sifflets');
const chrono = $('chrono');
const voile = $('voile');
const taille = $('taille');
const stats = $('stats');
const attente = $('attente');

let reglages = chargerReglages();
let partie = null; // état de la partie en cours (voir src/engine/game.js)
const ui = {
  demarre: null,   // horodatage du dernier démarrage du chrono
  minuteur: null,
  rendu: [],       // dernier état dessiné par case (évite de redessiner pour rien)
  demande: 0,      // numéro de la dernière demande de puzzle
};

// ---------- Génération des puzzles, hors du fil principal ----------

let worker = null;
const attentes = new Map();
let prochainId = 0;

function calculerIci(demande) {
  return new Promise((resolve, reject) => {
    // Petit délai : laisse l'écran afficher « préparation » avant le calcul.
    setTimeout(() => {
      try { resolve(puzzleFor(demande)); } catch (e) { reject(e); }
    }, 30);
  });
}

function demarrerWorker() {
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
    return;
  }
  worker.onmessage = ({ data }) => {
    const a = attentes.get(data.id);
    if (!a) return;
    attentes.delete(data.id);
    if (data.erreur) a.reject(new Error(data.erreur));
    else a.resolve(data.puzzle);
  };
  // Worker indisponible : on calcule ici, sans rien perdre des demandes en cours.
  worker.onerror = (e) => {
    e.preventDefault();
    worker.terminate();
    worker = null;
    for (const [id, a] of attentes) {
      attentes.delete(id);
      calculerIci(a.demande).then(a.resolve, a.reject);
    }
  };
}

function calculer(demande) {
  if (!worker) return calculerIci(demande);
  return new Promise((resolve, reject) => {
    const id = ++prochainId;
    attentes.set(id, { resolve, reject, demande });
    worker.postMessage({ id, ...demande });
  });
}

async function lancer(demande) {
  const n = ++ui.demande;
  plateau.classList.add('occupe');
  const minuterie = setTimeout(() => { if (n === ui.demande) attente.hidden = false; }, 150);
  try {
    const puzzle = await calculer(demande);
    if (n === ui.demande) nouvellePartie(puzzle, demande.type, demande.cle ?? null);
  } catch {
    if (n === ui.demande) afficherVoile('Oups', 'Impossible de préparer ce puzzle. Réessayez.', false);
  } finally {
    clearTimeout(minuterie);
    if (n === ui.demande) {
      attente.hidden = true;
      plateau.classList.remove('occupe');
    }
  }
}

// ---------- Parties ----------

function graineAleatoire() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function installer(p) {
  arreterChrono();
  partie = p;
  updateAutoCrosses(partie, reglages.autoCroix);
  voile.hidden = true;
  construirePlateau();
  rendreTout();
  rendreSifflets();
  rendreChrono();
  rendreStats();
}

function nouvellePartie(puzzle, mode, cleJour = null) {
  installer(createGame(puzzle, { mode, cleJour, zen: reglages.zen }));
  sauvegarder();
}

function partieDuJour() {
  lancer({ type: 'jour', cle: dateKey() });
}

function partieLibre() {
  lancer({ type: 'libre', size: Number(taille.value), seed: graineAleatoire() });
}

function rejouer() {
  nouvellePartie(partie.puzzle, partie.mode, partie.cleJour);
}

/** Reprend une partie sauvegardée non terminée. Renvoie false si rien à reprendre. */
function reprendre() {
  const p = restoreGame(chargerPartie(), { autoCroix: reglages.autoCroix });
  if (!p || p.fini) return false;
  if (p.mode === 'jour' && p.cleJour !== dateKey()) return false; // le puzzle du jour a changé
  installer(p);
  reprendreChrono();
  return true;
}

function sauvegarder() {
  if (partie) sauvegarderPartie({ ...saveableGame(partie), ecoule: tempsEcoule() });
}

// ---------- Plateau ----------

function construirePlateau() {
  const { size, regions } = partie.puzzle;
  plateau.style.setProperty('--n', size);
  plateau.classList.toggle('fini', partie.fini);
  plateau.replaceChildren();
  ui.rendu = new Array(size * size).fill('');
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
  const etat = partie.cells[i];
  const cle = `${etat}${etat === CROSS && !partie.manuel[i] ? 'a' : ''}`;
  if (ui.rendu[i] === cle) return;
  ui.rendu[i] = cle;
  const b = plateau.children[i];
  const { size, regions } = partie.puzzle;
  b.replaceChildren();
  if (etat === CROSS) {
    const s = document.createElement('span');
    s.className = partie.manuel[i] ? 'croix' : 'croix auto';
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
  for (let i = 0; i < partie.cells.length; i++) rendreCase(i);
  const surlignees = new Set(conflicts(partie));
  for (let i = 0; i < partie.cells.length; i++) plateau.children[i].classList.toggle('conflit', surlignees.has(i));
}

// ---------- Gestes ----------

function secouer(b) {
  b.classList.remove('erreur');
  void b.offsetWidth; // relance l'animation
  b.classList.add('erreur');
}

function toucher(i) {
  if (!partie || partie.fini) return;
  demarrerChrono();
  const b = plateau.children[i];
  const resultat = tap(partie, i, { autoCroix: reglages.autoCroix });
  if (resultat === 'ignore') return;
  if (resultat === 'marmotte' || resultat === 'victoire') {
    b.classList.add('pose');
    navigator.vibrate?.(15);
  } else if (resultat === 'erreur' || resultat === 'defaite') {
    secouer(b);
    navigator.vibrate?.([60, 40, 60]);
    rendreSifflets();
  }
  rendreTout();
  if (resultat === 'victoire') gagner();
  else if (resultat === 'defaite') perdre();
  else sauvegarder();
}

function gagner() {
  arreterChrono();
  plateau.classList.add('fini');
  navigator.vibrate?.([30, 30, 30, 30, 80]);
  const temps = partie.ecoule;
  const avant = chargerStats().meilleurs[partie.puzzle.size];
  enregistrerVictoire({ size: partie.puzzle.size, temps, cleJour: partie.cleJour, zen: partie.zen });
  rendreStats();
  sauvegarder();
  const record = !partie.zen && (!avant || temps < avant) ? ' Nouveau record pour cette taille !' : '';
  afficherVoile('Alpage en paix !', `Toutes les marmottes ont leur territoire en ${formaterTemps(temps)}.${record}`, false);
}

function perdre() {
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
  sifflets.hidden = partie.zen;
  $('badge-zen').hidden = !partie.zen;
  sifflets.replaceChildren();
  for (let k = 0; k < SIFFLETS_MAX; k++) {
    sifflets.insertAdjacentHTML('beforeend', `<svg class="${k < partie.sifflets ? '' : 'perdu'}"><use href="#sifflet"/></svg>`);
  }
  sifflets.setAttribute('aria-label', `${partie.sifflets} sifflet${partie.sifflets > 1 ? 's' : ''} sur ${SIFFLETS_MAX}`);
}

function rendreStats() {
  const s = chargerStats();
  const serie = serieCourante(s, dateKey());
  const parts = [`Série : ${serie} jour${serie > 1 ? 's' : ''}`, `Réussis : ${s.reussis}`];
  const meilleur = partie && s.meilleurs[partie.puzzle.size];
  if (meilleur) parts.push(`Record ${partie.puzzle.size}×${partie.puzzle.size} : ${formaterTemps(meilleur)}`);
  stats.textContent = parts.join(' · ');
}

function tempsEcoule() {
  if (!partie) return 0;
  return partie.ecoule + (ui.demarre ? Date.now() - ui.demarre : 0);
}

function formaterTemps(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function rendreChrono() {
  chrono.textContent = formaterTemps(tempsEcoule());
}

function demarrerChrono() {
  if (!partie || ui.demarre || partie.fini) return;
  ui.demarre = Date.now();
  ui.minuteur = setInterval(rendreChrono, 500);
}

function arreterChrono() {
  if (ui.demarre && partie) partie.ecoule += Date.now() - ui.demarre;
  ui.demarre = null;
  clearInterval(ui.minuteur);
  ui.minuteur = null;
  rendreChrono();
}

/** Une partie commencée fait tourner le chrono dès qu'elle est à l'écran. */
function reprendreChrono() {
  if (partie && !partie.fini && partie.ecoule > 0 && !document.hidden) demarrerChrono();
}

// Le chrono s'arrête quand l'app passe en arrière-plan, et repart à son retour.
document.addEventListener('visibilitychange', () => {
  if (!partie) return;
  if (document.hidden) {
    arreterChrono();
    sauvegarder();
  } else {
    reprendreChrono();
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
  if (cle === 'autoCroix' && partie && !partie.fini) {
    updateAutoCrosses(partie, valeur);
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
$('btn-voir').addEventListener('click', () => { voile.hidden = true; });
$('btn-nouveau').addEventListener('click', partieLibre);
$('btn-reglages').addEventListener('click', () => { $('reglages').hidden = false; });
$('btn-reglages-fermer').addEventListener('click', () => { $('reglages').hidden = true; });
for (const cle of ['autoCroix', 'zen', 'motifs']) {
  $(`reg-${cle}`).addEventListener('change', (e) => changerReglage(cle, e.target.checked));
}
$('btn-aide').addEventListener('click', ouvrirTuto);
$('tuto-prec').addEventListener('click', () => montrerEtape(etape - 1));
$('tuto-suiv').addEventListener('click', () => (etape === etapes.length - 1 ? fermerTuto() : montrerEtape(etape + 1)));

demarrerWorker();
appliquerReglages();
rendreStats();
if (!reprendre()) partieDuJour();
if (!reglages.tutoVu) ouvrirTuto();

// Hors ligne : le service worker garde une copie du jeu dans le téléphone.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
}
