// Règles du jeu, indépendantes de l'interface.
//
// Un puzzle : { size, regions, solution }
//   - size : côté de la grille (N) ; il y a N alpages numérotés 0..N-1.
//   - regions : tableau de N×N entiers, regions[row * size + col] = alpage de la case.
//   - solution : tableau de N entiers, solution[row] = colonne de la marmotte de la ligne.
// Un état de jeu : tableau de N×N valeurs parmi EMPTY, CROSS, MARMOT.

export const MIN_SIZE = 5;
export const MAX_SIZE = 10;

export const EMPTY = 0;
export const CROSS = 1;
export const MARMOT = 2;

/** Deux cases distinctes se touchent-elles (côté ou coin) ? */
export function areAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

/** Un placement complet (une colonne par ligne) respecte-t-il toutes les règles ? */
export function isValidSolution(puzzle, placement) {
  const { size, regions } = puzzle;
  if (!Array.isArray(placement) || placement.length !== size) return false;
  const cols = new Set();
  const regs = new Set();
  for (let row = 0; row < size; row++) {
    const col = placement[row];
    if (!Number.isInteger(col) || col < 0 || col >= size) return false;
    if (cols.has(col)) return false;
    cols.add(col);
    const reg = regions[row * size + col];
    if (regs.has(reg)) return false;
    regs.add(reg);
    if (row > 0 && Math.abs(col - placement[row - 1]) <= 1) return false;
  }
  return true;
}

/**
 * Indices des cases contenant une marmotte en conflit avec une autre
 * (même ligne, même colonne, même alpage, ou contact). Sert au mode sans sifflets.
 */
export function findConflicts(puzzle, cells) {
  const { size, regions } = puzzle;
  const marmots = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === MARMOT) marmots.push(i);
  const bad = new Set();
  for (let a = 0; a < marmots.length; a++) {
    for (let b = a + 1; b < marmots.length; b++) {
      const i = marmots[a], j = marmots[b];
      const ri = Math.floor(i / size), ci = i % size;
      const rj = Math.floor(j / size), cj = j % size;
      if (ri === rj || ci === cj || regions[i] === regions[j] || areAdjacent(ri, ci, rj, cj)) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return [...bad].sort((x, y) => x - y);
}

/** La grille est-elle résolue : exactement les marmottes de la solution ? */
export function isSolved(puzzle, cells) {
  const { size, solution } = puzzle;
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== MARMOT) continue;
    count++;
    if (solution[Math.floor(i / size)] !== i % size) return false;
  }
  return count === size;
}
