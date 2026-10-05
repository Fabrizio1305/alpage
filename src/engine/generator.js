// Générateur de puzzles à solution unique.
//
// 1. Tirer un placement de marmottes valide (une par ligne et colonne, jamais deux en contact).
// 2. Faire pousser un alpage autour de chaque marmotte, avec des appétits différents, jusqu'à
//    couvrir la grille. Appétits très inégaux : petits alpages, déductions faciles ; appétits
//    proches (difficile, expert) : alpages de tailles voisines, plus durs à démêler.
// 3. Tant que les déductions de logic.js ne résolvent pas le puzzle (ce qui prouverait son
//    unicité), déplacer vers un alpage voisin une case d'une solution parasite (la parasite
//    meurt, la vraie solution survit) ou, à défaut, une case que les déductions n'ont pas su
//    exclure. Les alpages restent d'un seul tenant.
// 4. Si un niveau est demandé, retoucher les frontières une case à la fois jusqu'à ce que
//    la résolution à la main (logic.js) demande exactement ce niveau, en gardant l'unicité.
// Tout l'aléatoire vient de la graine : même graine → même puzzle, sur tout appareil.

import { createRng } from './random.js';
import { exploreSolutions } from './solver.js';
import { resoudreParDeduction, NIVEAUX } from './logic.js';
import { MIN_SIZE, MAX_SIZE } from './rules.js';

const MAX_RESTARTS = 200;
const MAX_REPAIRS = 400;
const MAX_RETOUCHES = 600;
const MAX_AJUSTEMENTS = 40;
// Étapes de recherche exhaustive au plus : un coup d'œil sur toute la grille (les parasites
// d'une grille encore très ambiguë sortent tout de suite), puis une recherche plus longue
// limitée aux cases que les déductions n'ont pas exclues. Jamais de preuve d'unicité par
// recherche sur toute la grille : elle s'enlise sur les grandes grilles.
const BUDGET_LARGE = 500;
const BUDGET_ETROIT = 20000;

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
      const owners = [];
      for (const n of neighbours(size, i)) {
        const r = regions[n];
        if (r !== -1 && !owners.includes(r)) { owners.push(r); frontiers[r].push(i); }
      }
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
 * Vérifie un puzzle. Renvoie :
 *   - { deduction } : les déductions le résolvent (résultat de resoudreParDeduction). Cela
 *     prouve l'unicité, puisque chaque déduction vaut pour toute solution ;
 *   - { parasite } : une autre solution que la vraie ;
 *   - { restantes } : ni l'un ni l'autre (unique mais il faudrait deviner, ou recherche trop
 *     longue) ; cases que les déductions n'ont pas su exclure.
 */
function verifier(puzzle) {
  const vraie = (s) => s.every((c, r) => c === puzzle.solution[r]);
  const parasite = (sols) => ({ parasite: vraie(sols[0]) ? sols[1] : sols[0] });
  const large = exploreSolutions(puzzle, 2, BUDGET_LARGE);
  if (large.solutions.length === 2) return parasite(large.solutions);
  // Déductions sans hypothèse (rapides) : si elles bloquent, la parasite éventuelle se cache
  // parmi les cases qu'elles n'ont pas exclues, ce qui réduit beaucoup la recherche.
  const simple = resoudreParDeduction(puzzle, 3);
  if (simple.resolu) return { deduction: simple };
  const etroite = exploreSolutions(puzzle, 2, BUDGET_ETROIT, simple.restantes);
  if (etroite.solutions.length === 2) return parasite(etroite.solutions);
  if (!etroite.complet && !large.complet) return { restantes: simple.restantes };
  // Solution unique : l'hypothèse courte suffit-elle à la trouver sans deviner ?
  const complete = resoudreParDeduction(puzzle);
  return complete.resolu ? { deduction: complete } : { restantes: complete.restantes };
}

/**
 * Fait passer la case `cell` (sans marmotte) dans un alpage voisin. Si elle est au milieu de
 * son alpage, l'alpage voisin s'étend jusqu'à elle par le plus court chemin. Chaque case
 * déplacée emmène celles qu'elle seule reliait à leur marmotte : tous les alpages restent
 * d'un seul tenant. L'alpage n° r est celui de la marmotte de la ligne r. Renvoie false si
 * aucun chemin n'évite la marmotte.
 */
function deplacer(puzzle, cell, rng) {
  const { size, regions, solution } = puzzle;
  const from = regions[cell];
  const ancre = from * size + solution[from];
  // Plus court chemin dans l'alpage, de `cell` à une case qui touche un autre alpage.
  const prev = new Map([[cell, -1]]);
  const file = [cell];
  let bord = -1;
  for (let k = 0; k < file.length && bord === -1; k++) {
    const i = file[k];
    if (neighbours(size, i).some((n) => regions[n] !== from)) bord = i;
    for (const n of neighbours(size, i)) {
      if (regions[n] === from && n !== ancre && !prev.has(n)) { prev.set(n, i); file.push(n); }
    }
  }
  if (bord === -1) return false;
  const targets = [...new Set(neighbours(size, bord).map((n) => regions[n]).filter((r) => r !== from))];
  const to = targets[rng.int(targets.length)];
  // Du bord jusqu'à `cell` : chaque case touche la précédente, l'alpage `to` reste d'un tenant.
  for (let i = bord; i !== -1; i = prev.get(i)) {
    if (regions[i] !== from) continue; // déjà emmenée avec une case détachée
    for (const j of cutOff(size, regions, from, i, ancre)) regions[j] = to;
    regions[i] = to;
  }
  return true;
}

/**
 * Rend le puzzle unique et résoluble par déduction en déplaçant des cases entre alpages
 * voisins : une case de chaque solution parasite (la parasite meurt, la vraie solution
 * survit) ou, si les déductions bloquent sans parasite trouvée, une des cases qu'elles n'ont
 * pas su exclure. Renvoie le résultat des déductions, ou null en cas d'échec.
 */
function repairUniqueness(puzzle, rng) {
  const { size, solution } = puzzle;
  for (let iter = 0; iter < MAX_REPAIRS; iter++) {
    const verif = verifier(puzzle);
    if (verif.deduction) return verif.deduction;
    const cases = verif.parasite
      ? verif.parasite.map((col, row) => row * size + col).filter((i) => solution[Math.floor(i / size)] !== i % size)
      : [...verif.restantes.keys()].filter((i) => verif.restantes[i] && solution[Math.floor(i / size)] !== i % size);
    if (!rng.shuffle(cases).some((cell) => deplacer(puzzle, cell, rng))) return null;
  }
  return null;
}

/**
 * Note d'un puzzle résolu par déduction, par rapport au niveau visé : `ecart` (0 = bon niveau)
 * d'abord, puis `score`, qui grandit quand le puzzle se rapproche du niveau visé.
 */
function noter({ niveau, etapes }, cible) {
  const poids = etapes[2] + 4 * etapes[3] + 16 * etapes[4];
  return { niveau, ecart: Math.abs(niveau - cible), score: niveau < cible ? poids : -poids };
}

/**
 * Retouche les frontières d'un puzzle unique vers le niveau `cible` (1 à 4) : une case
 * sans marmotte passe dans un alpage voisin ; on garde la retouche si le puzzle reste
 * unique et ne s'éloigne pas du niveau visé. Renvoie la note finale (ecart 0 : atteint).
 */
function ajuster(puzzle, deduction, cible, rng) {
  const { size, regions, solution } = puzzle;
  const marmotte = new Set(solution.map((col, row) => row * size + col));
  let note = noter(deduction, cible);
  for (let iter = 0; iter < MAX_RETOUCHES && note.ecart > 0; iter++) {
    const cell = rng.int(size * size);
    if (marmotte.has(cell)) continue;
    const from = regions[cell];
    const targets = [...new Set(neighbours(size, cell).map((n) => regions[n]).filter((r) => r !== from))];
    if (!targets.length || !staysConnected(size, regions, from, cell)) continue;
    regions[cell] = targets[rng.int(targets.length)];
    const verif = verifier(puzzle);
    const essai = verif.deduction ? noter(verif.deduction, cible) : null;
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
    const deduction = repairUniqueness(puzzle, rng);
    if (!deduction) continue;
    if (cible === 0) return { ...puzzle, niveau: NIVEAUX[deduction.niveau - 1] };
    ajustements++;
    const note = ajuster(puzzle, deduction, cible, rng);
    if (note.ecart === 0) return { ...puzzle, niveau };
    if (note.ecart < (meilleur?.note.ecart ?? Infinity)) meilleur = { puzzle, note };
  }
  if (meilleur) return { ...meilleur.puzzle, niveau: NIVEAUX[meilleur.note.niveau - 1] };
  throw new Error(`Pas de puzzle unique trouvé (taille ${size}, graine ${seed}, niveau ${niveau})`);
}
