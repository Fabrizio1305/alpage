// Solveur par retour arrière, ligne par ligne. Sert à garantir l'unicité de la solution.

/**
 * Cherche jusqu'à `limit` solutions (tableaux colonne par ligne) en visitant au plus
 * `maxNodes` étapes, parmi les cases `permises` (toutes si null). Renvoie
 * { solutions, complet } : complet = false si la limite d'étapes a coupé la recherche.
 */
export function exploreSolutions(puzzle, limit = 2, maxNodes = Infinity, permises = null) {
  const { size, regions } = puzzle;
  // colonnes[reg * size + row] : masque des colonnes permises de l'alpage `reg` dans la ligne `row`.
  const colonnes = new Int32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    if (!permises || permises[i]) colonnes[regions[i] * size + Math.floor(i / size)] |= 1 << (i % size);
  }
  const placement = new Array(size).fill(-1);
  const found = [];
  let nodes = 0;
  let coupe = false;

  /** Chaque alpage encore libre a-t-il une case possible dans les lignes restantes ? */
  function viable(row, usedCol, usedReg) {
    for (let reg = 0; reg < size; reg++) {
      if (usedReg & (1 << reg)) continue;
      let r = row;
      while (r < size && !(colonnes[reg * size + r] & ~usedCol)) r++;
      if (r === size) return false;
    }
    return true;
  }

  function step(row, prevCol, usedCol, usedReg) {
    if (++nodes > maxNodes) { coupe = true; return true; }
    if (row === size) {
      found.push([...placement]);
      return found.length >= limit;
    }
    if (!viable(row, usedCol, usedReg)) return false;
    const base = row * size;
    for (let col = 0; col < size; col++) {
      if (usedCol & (1 << col)) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      if (permises && !permises[base + col]) continue;
      const reg = regions[base + col];
      if (usedReg & (1 << reg)) continue;
      placement[row] = col;
      if (step(row + 1, col, usedCol | (1 << col), usedReg | (1 << reg))) return true;
    }
    return false;
  }

  step(0, -1, 0, 0);
  return { solutions: found, complet: !coupe };
}

/**
 * Renvoie jusqu'à `limit` solutions (tableaux colonne par ligne).
 * Pour vérifier l'unicité : findSolutions(puzzle, 2).length === 1.
 */
export function findSolutions(puzzle, limit = 2) {
  return exploreSolutions(puzzle, limit).solutions;
}

/** Nombre de solutions, plafonné à `limit`. */
export function countSolutions(puzzle, limit = 2) {
  return findSolutions(puzzle, limit).length;
}

/** Première solution trouvée, ou null. */
export function solve(puzzle) {
  return findSolutions(puzzle, 1)[0] ?? null;
}
