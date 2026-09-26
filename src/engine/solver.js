// Solveur par retour arrière, ligne par ligne. Sert à garantir l'unicité de la solution.

/**
 * Renvoie jusqu'à `limit` solutions (tableaux colonne par ligne).
 * Pour vérifier l'unicité : findSolutions(puzzle, 2).length === 1.
 */
export function findSolutions(puzzle, limit = 2) {
  const { size, regions } = puzzle;
  const usedCol = new Array(size).fill(false);
  const usedReg = new Array(size).fill(false);
  const placement = new Array(size).fill(-1);
  const found = [];

  function step(row, prevCol) {
    if (row === size) {
      found.push([...placement]);
      return found.length >= limit;
    }
    const base = row * size;
    for (let col = 0; col < size; col++) {
      if (usedCol[col]) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      const reg = regions[base + col];
      if (usedReg[reg]) continue;
      usedCol[col] = true;
      usedReg[reg] = true;
      placement[row] = col;
      const stop = step(row + 1, col);
      usedCol[col] = false;
      usedReg[reg] = false;
      if (stop) return true;
    }
    return false;
  }

  step(0, -1);
  return found;
}

/** Nombre de solutions, plafonné à `limit`. */
export function countSolutions(puzzle, limit = 2) {
  return findSolutions(puzzle, limit).length;
}

/** Première solution trouvée, ou null. */
export function solve(puzzle) {
  return findSolutions(puzzle, 1)[0] ?? null;
}
