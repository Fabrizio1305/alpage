// Générateur de puzzles à solution unique.
//
// 1. Tirer un placement de marmottes valide (une par ligne et colonne, jamais deux en contact).
// 2. Faire pousser un alpage autour de chaque marmotte, avec des appétits différents, jusqu'à
//    couvrir la grille. Appétits très inégaux : petits alpages, déductions faciles ; appétits
//    proches (difficile, expert) : alpages de tailles voisines, plus durs à démêler.
// 3. Tant qu'il existe une solution parasite, déplacer une case de cette solution vers un
//    alpage voisin (les alpages restent d'un seul tenant) : la parasite meurt, la vraie
//    solution survit.
// 4. Si un niveau est demandé, retoucher les frontières une case à la fois jusqu'à ce que
//    la résolution à la main (logic.js) demande exactement ce niveau, en gardant l'unicité.
// Tout l'aléatoire vient de la graine : même graine → même puzzle, sur tout appareil.

import { createRng } from './random.js';
import { findSolutions } from './solver.js';
import { resoudreParDeduction, NIVEAUX } from './logic.js';
import { MIN_SIZE, MAX_SIZE } from './rules.js';

const MAX_RESTARTS = 200;
const MAX_REPAIRS = 400;
const MAX_RETOUCHES = 600;
const MAX_AJUSTEMENTS = 40;

/** Placement aléatoire valide : solution[row] = colonne. */
function randomPlacement(size, rng) {
  const usedCol = new Array(size).fill(false);
  const placement = new Array(size).fill(-1);
  function step(row) {
    if (row === size) return true;
    const cols = rng.shuffle([...Array(size).keys()]);
    for (const col of cols) {
      if (usedCol[col]) continue;
      if (row > 0 && Math.abs(col - placement[row - 1]) <= 1) continue;
      usedCol[col] = true;
      placement[row] = col;
      if (step(row + 1)) return true;
      usedCol[col] = false;
    }
    return false;
  }
  if (!step(0)) throw new Error(`Aucun placement possible pour une grille ${size}×${size}`);
  return placement;
}

/** Voisins de côté d'une case. */
function neighbours(size, i) {
  const r = Math.floor(i / size), c = i % size, out = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

/** Croissance des alpages depuis chaque marmotte, chaque alpage ayant son appétit. */
function growRegions(size, placement, rng, appetit) {
  const regions = new Array(size * size).fill(-1);
  for (let row = 0; row < size; row++) regions[row * size + placement[row]] = row;
  const appetite = Array.from({ length: size }, () => appetit(rng));
  let remaining = size * size - size;
  while (remaining > 0) {
    // Frontière de chaque alpage : cases vides qui le touchent.
    const frontiers = Array.from({ length: size }, () => []);
    for (let i = 0; i < regions.length; i++) {
      if (regions[i] !== -1) continue;
      const owners = new Set(neighbours(size, i).map((n) => regions[n]).filter((r) => r !== -1));
      for (const r of owners) frontiers[r].push(i);
    }
    // Tirage d'un alpage pondéré par son appétit, parmi ceux qui peuvent encore grandir.
    let total = 0;
    for (let r = 0; r < size; r++) if (frontiers[r].length) total += appetite[r];
    let pick = rng.next() * total;
    let reg = 0;
    for (let r = 0; r < size; r++) {
      if (!frontiers[r].length) continue;
      pick -= appetite[r];
      if (pick <= 0) { reg = r; break; }
      reg = r;
    }
    const cell = frontiers[reg][rng.int(frontiers[reg].length)];
    regions[cell] = reg;
    remaining--;
  }
  return regions;
}

/** L'alpage `reg` reste-t-il d'un seul tenant si l'on retire la case `removed` ? */
function staysConnected(size, regions, reg, removed) {
  let start = -1, count = 0;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === reg && i !== removed) { count++; if (start === -1) start = i; }
  }
  if (count === 0) return false;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    for (const n of neighbours(size, i)) {
      if (regions[n] === reg && n !== removed && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return seen.size === count;
}

/**
 * Cases de l'alpage `reg` séparées de sa marmotte `anchor` si l'on retire la case `removed`.
 */
function cutOff(size, regions, reg, removed, anchor) {
  const seen = new Set([anchor]);
  const stack = [anchor];
  while (stack.length) {
    const i = stack.pop();
    for (const n of neighbours(size, i)) {
      if (regions[n] === reg && n !== removed && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  const out = [];
  for (let i = 0; i < regions.length; i++) if (regions[i] === reg && i !== removed && !seen.has(i)) out.push(i);
  return out;
}

/**
 * Élimine les solutions parasites en déplaçant des cases entre alpages voisins.
 * Une case déplacée emmène avec elle les cases qu'elle seule reliait à leur marmotte : tous
 * les alpages restent d'un seul tenant. L'alpage n° r est celui de la marmotte de la ligne r.
 * Renvoie true si le puzzle est devenu unique.
 */
function repairUniqueness(puzzle, rng) {
  const { size, regions, solution } = puzzle;
  for (let iter = 0; iter < MAX_REPAIRS; iter++) {
    const sols = findSolutions(puzzle, 2);
    if (sols.length === 1) return true;
    if (sols.length === 0) return false;
    const other = sols[0].every((c, r) => c === solution[r]) ? sols[1] : sols[0];
    // Lignes où la parasite diffère de la vraie solution, dans un ordre aléatoire.
    const rows = rng.shuffle([...Array(size).keys()].filter((r) => other[r] !== solution[r]));
    let moved = false;
    for (const row of rows) {
      const cell = row * size + other[row];
      const from = regions[cell];
      const targets = rng.shuffle([...new Set(neighbours(size, cell).map((n) => regions[n]).filter((r) => r !== from))]);
      if (!targets.length) continue;
      for (const i of cutOff(size, regions, from, cell, from * size + solution[from])) regions[i] = targets[0];
      regions[cell] = targets[0];
      moved = true;
      break;
    }
    if (!moved) return false;
  }
  return false;
}

/**
 * Note d'un puzzle par rapport au niveau visé : `ecart` (0 = bon niveau) d'abord, puis
 * `score`, qui grandit quand le puzzle se rapproche du niveau visé sans encore l'atteindre.
 */
function noter(puzzle, cible) {
  const { resolu, niveau, etapes } = resoudreParDeduction(puzzle);
  if (!resolu) return { niveau: 0, ecart: Infinity, score: 0 };
  const poids = etapes[2] + 4 * etapes[3] + 16 * etapes[4];
  return { niveau, ecart: Math.abs(niveau - cible), score: niveau < cible ? poids : -poids };
}

/**
 * Retouche les frontières d'un puzzle unique vers le niveau `cible` (1 à 4) : une case
 * sans marmotte passe dans un alpage voisin ; on garde la retouche si le puzzle reste
 * unique et ne s'éloigne pas du niveau visé. Renvoie la note finale (ecart 0 : atteint).
 */
function ajuster(puzzle, cible, rng) {
  const { size, regions, solution } = puzzle;
  const marmotte = new Set(solution.map((col, row) => row * size + col));
  let note = noter(puzzle, cible);
  for (let iter = 0; iter < MAX_RETOUCHES && note.ecart > 0; iter++) {
    const cell = rng.int(size * size);
    if (marmotte.has(cell)) continue;
    const from = regions[cell];
    const targets = [...new Set(neighbours(size, cell).map((n) => regions[n]).filter((r) => r !== from))];
    if (!targets.length || !staysConnected(size, regions, from, cell)) continue;
    regions[cell] = targets[rng.int(targets.length)];
    const essai = findSolutions(puzzle, 2).length === 1 ? noter(puzzle, cible) : null;
    if (essai && (essai.ecart < note.ecart || (essai.ecart === note.ecart && essai.score >= note.score))) {
      note = essai;
    } else {
      regions[cell] = from;
    }
  }
  return note;
}

/** Appétits des alpages : très inégaux (petits alpages, déductions faciles) ou proches. */
const APPETITS = {
  inegaux: (rng) => 0.2 + rng.next() ** 2 * 3,
  proches: (rng) => 0.7 + rng.next() * 0.6,
};

/**
 * Génère un puzzle { size, regions, solution, seed, niveau } à solution unique.
 * @param {number} size côté de la grille, entre MIN_SIZE et MAX_SIZE
 * @param {number} seed entier non signé
 * @param {string|null} niveau 'facile', 'moyen', 'difficile' ou 'expert' ; null : au hasard
 */
export function generatePuzzle(size, seed, niveau = null) {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new RangeError(`Taille ${size} hors de [${MIN_SIZE}, ${MAX_SIZE}]`);
  }
  if (niveau !== null && !NIVEAUX.includes(niveau)) throw new RangeError(`Niveau inconnu : ${niveau}`);
  const cible = NIVEAUX.indexOf(niveau) + 1;
  const appetit = cible >= 3 ? APPETITS.proches : APPETITS.inegaux;
  const rng = createRng(seed);
  // Si le niveau visé reste hors d'atteinte, on rend le puzzle qui s'en est le plus approché.
  let meilleur = null;
  let ajustements = 0;
  for (let restart = 0; restart < MAX_RESTARTS && ajustements < MAX_AJUSTEMENTS; restart++) {
    const solution = randomPlacement(size, rng);
    const regions = growRegions(size, solution, rng, appetit);
    const puzzle = { size, regions, solution, seed };
    if (!repairUniqueness(puzzle, rng)) continue;
    if (cible === 0) {
      const { resolu, niveau: n } = resoudreParDeduction(puzzle);
      if (resolu) return { ...puzzle, niveau: NIVEAUX[n - 1] };
      continue;
    }
    ajustements++;
    const note = ajuster(puzzle, cible, rng);
    if (note.ecart === 0) return { ...puzzle, niveau };
    if (note.ecart < (meilleur?.note.ecart ?? Infinity)) meilleur = { puzzle, note };
  }
  if (meilleur) return { ...meilleur.puzzle, niveau: NIVEAUX[meilleur.note.niveau - 1] };
  throw new Error(`Pas de puzzle unique trouvé (taille ${size}, graine ${seed}, niveau ${niveau})`);
}
