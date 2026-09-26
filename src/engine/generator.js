// Générateur de puzzles à solution unique.
//
// 1. Tirer un placement de marmottes valide (une par ligne et colonne, jamais deux en contact).
// 2. Faire pousser un alpage autour de chaque marmotte, avec des appétits différents pour
//    obtenir des alpages de tailles variées, jusqu'à couvrir la grille.
// 3. Tant qu'il existe une solution parasite, déplacer une case de cette solution vers un
//    alpage voisin (sans casser la connexité) : la parasite meurt, la vraie solution survit.
// Tout l'aléatoire vient de la graine : même graine → même puzzle, sur tout appareil.

import { createRng } from './random.js';
import { findSolutions } from './solver.js';
import { MIN_SIZE, MAX_SIZE } from './rules.js';

const MAX_RESTARTS = 200;
const MAX_REPAIRS = 400;

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
function growRegions(size, placement, rng) {
  const regions = new Array(size * size).fill(-1);
  for (let row = 0; row < size; row++) regions[row * size + placement[row]] = row;
  const appetite = Array.from({ length: size }, () => 0.2 + rng.next() ** 2 * 3);
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
 * Élimine les solutions parasites en déplaçant des cases entre alpages voisins.
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
      if (!staysConnected(size, regions, from, cell)) continue;
      regions[cell] = targets[0];
      moved = true;
      break;
    }
    if (!moved) return false;
  }
  return false;
}

/**
 * Génère un puzzle { size, regions, solution, seed } à solution unique.
 * @param {number} size côté de la grille, entre MIN_SIZE et MAX_SIZE
 * @param {number} seed entier non signé
 */
export function generatePuzzle(size, seed) {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new RangeError(`Taille ${size} hors de [${MIN_SIZE}, ${MAX_SIZE}]`);
  }
  const rng = createRng(seed);
  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    const solution = randomPlacement(size, rng);
    const regions = growRegions(size, solution, rng);
    const puzzle = { size, regions, solution, seed };
    if (repairUniqueness(puzzle, rng)) return puzzle;
  }
  throw new Error(`Pas de puzzle unique trouvé (taille ${size}, graine ${seed})`);
}
