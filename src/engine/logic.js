// Résolution « à la main » : le puzzle est résolu uniquement avec des déductions qu'une
// personne peut faire, en essayant toujours la plus simple d'abord. La déduction la plus
// difficile dont on a eu besoin donne le niveau du puzzle.
//
//   1. Dernière place : une ligne, une colonne ou un alpage n'a plus qu'une case possible.
//   2. Enfermement simple : un alpage tient dans une seule ligne (ou colonne), qui ne peut
//      donc rien accueillir d'autre ; et l'inverse. Case qui barrerait tout un alpage, une
//      ligne ou une colonne : elle ne peut pas porter de marmotte.
//   3. Enfermement multiple : k alpages tiennent dans k lignes (ou colonnes), qui ne peuvent
//      rien accueillir d'autre ; et l'inverse.
//   4. Hypothèse courte : « si je mets une marmotte ici, les déductions 1 et 2 mènent à une
//      impasse », donc la case est exclue.
// Un puzzle qu'aucune de ces déductions ne résout est rejeté par le générateur : il faudrait
// deviner.

export const NIVEAUX = ['facile', 'moyen', 'difficile', 'expert'];

const RIEN = 0;
const PROGRES = 1;
const IMPASSE = -1;

/** Prépare les tables d'un puzzle : unités (lignes, colonnes, alpages) et voisinages. */
function preparer(puzzle) {
  const { size: n, regions } = puzzle;
  const nn = n * n;
  // Unités 0..n-1 : lignes ; n..2n-1 : colonnes ; 2n..3n-1 : alpages.
  const unites = Array.from({ length: 3 * n }, () => []);
  const unitesDe = [];
  for (let i = 0; i < nn; i++) {
    const r = Math.floor(i / n), c = i % n, a = regions[i];
    unites[r].push(i);
    unites[n + c].push(i);
    unites[2 * n + a].push(i);
    unitesDe.push([r, n + c, 2 * n + a]);
  }
  // voit[i * nn + j] : une marmotte en i interdit la case j.
  const voit = new Uint8Array(nn * nn);
  for (let i = 0; i < nn; i++) {
    const ri = Math.floor(i / n), ci = i % n;
    for (let j = 0; j < nn; j++) {
      if (i === j) continue;
      const rj = Math.floor(j / n), cj = j % n;
      if (ri === rj || ci === cj || regions[i] === regions[j] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) {
        voit[i * nn + j] = 1;
      }
    }
  }
  return { n, nn, unites, unitesDe, voit };
}

function nouvelEtat(ctx) {
  return { possible: new Uint8Array(ctx.nn).fill(1), faite: new Uint8Array(3 * ctx.n), marmottes: [] };
}

function copier(etat) {
  return { possible: etat.possible.slice(), faite: etat.faite.slice(), marmottes: [...etat.marmottes] };
}

function poser(ctx, etat, i) {
  const { nn, voit } = ctx;
  for (let j = 0; j < nn; j++) if (voit[i * nn + j]) etat.possible[j] = 0;
  etat.possible[i] = 0;
  for (const u of ctx.unitesDe[i]) etat.faite[u] = 1;
  etat.marmottes.push(i);
}

function candidats(ctx, etat, u) {
  return ctx.unites[u].filter((i) => etat.possible[i]);
}

/** 1. Dernière place. */
function dernierePlace(ctx, etat) {
  for (let u = 0; u < 3 * ctx.n; u++) {
    if (etat.faite[u]) continue;
    const cs = candidats(ctx, etat, u);
    if (cs.length === 0) return IMPASSE;
    if (cs.length === 1) { poser(ctx, etat, cs[0]); return PROGRES; }
  }
  return RIEN;
}

function popcount(x) {
  let k = 0;
  for (; x; x &= x - 1) k++;
  return k;
}

/**
 * 2 et 3. Enfermement : k unités d'un type (ex. alpages) dont les cases possibles tiennent
 * dans k unités d'un autre type (ex. lignes). Ces k lignes appartiennent alors à ces k
 * alpages : leurs autres cases sont exclues. Moins de k lignes : impasse.
 * Il suffit de chercher k ≤ m/2 dans les deux sens (le cas complémentaire est le même).
 */
function enfermement(ctx, etat, kMin, kMax) {
  const { n } = ctx;
  for (let ta = 0; ta < 3; ta++) {
    for (let tb = 0; tb < 3; tb++) {
      if (ta === tb) continue;
      // Unités de type A encore ouvertes, avec le masque des unités de type B qu'elles touchent.
      const ouvertes = [];
      for (let a = 0; a < n; a++) {
        const u = ta * n + a;
        if (etat.faite[u]) continue;
        let masque = 0;
        for (const i of ctx.unites[u]) if (etat.possible[i]) masque |= 1 << (ctx.unitesDe[i][tb] - tb * n);
        if (!masque) return IMPASSE;
        ouvertes.push({ u, masque });
      }
      const kHaut = Math.min(kMax, Math.floor(ouvertes.length / 2));
      for (let k = kMin; k <= kHaut; k++) {
        const r = groupeEnferme(ctx, etat, ouvertes, k, ta, tb);
        if (r !== RIEN) return r;
      }
    }
  }
  return RIEN;
}

/** Cherche k unités ouvertes (type ta) enfermées dans k unités de type tb, et exclut. */
function groupeEnferme(ctx, etat, ouvertes, k, ta, tb) {
  const { n } = ctx;
  const choix = [];

  function conclure(union) {
    const p = popcount(union);
    if (p < k) return IMPASSE;
    const dedans = new Set(choix);
    let exclu = false;
    for (let b = 0; b < n; b++) {
      if (!(union & (1 << b))) continue;
      for (const i of ctx.unites[tb * n + b]) {
        if (etat.possible[i] && !dedans.has(ctx.unitesDe[i][ta])) { etat.possible[i] = 0; exclu = true; }
      }
    }
    return exclu ? PROGRES : RIEN;
  }

  function parcourir(depart, union) {
    if (popcount(union) > k) return RIEN; // l'union ne fait que grandir
    if (choix.length === k) return conclure(union);
    for (let x = depart; x <= ouvertes.length - (k - choix.length); x++) {
      choix.push(ouvertes[x].u);
      const r = parcourir(x + 1, union | ouvertes[x].masque);
      choix.pop();
      if (r !== RIEN) return r;
    }
    return RIEN;
  }

  return parcourir(0, 0);
}

/** 2. Case qui, occupée, ne laisserait aucune place à une ligne, une colonne ou un alpage. */
function caseQuiBarre(ctx, etat) {
  const { nn, voit } = ctx;
  for (let u = 0; u < 3 * ctx.n; u++) {
    if (etat.faite[u]) continue;
    const cs = candidats(ctx, etat, u);
    let exclu = false;
    for (let x = 0; x < nn; x++) {
      if (!etat.possible[x] || cs.includes(x)) continue;
      if (cs.every((c) => voit[x * nn + c])) { etat.possible[x] = 0; exclu = true; }
    }
    if (exclu) return PROGRES;
  }
  return RIEN;
}

/** Applique les déductions jusqu'au niveau donné, une fois. Renvoie [résultat, niveau]. */
function etape(ctx, etat, niveauMax) {
  let r = dernierePlace(ctx, etat);
  if (r !== RIEN) return [r, 1];
  if (niveauMax < 2) return [RIEN, 0];
  r = enfermement(ctx, etat, 1, 1);
  if (r !== RIEN) return [r, 2];
  r = caseQuiBarre(ctx, etat);
  if (r !== RIEN) return [r, 2];
  if (niveauMax < 3) return [RIEN, 0];
  r = enfermement(ctx, etat, 2, ctx.n);
  if (r !== RIEN) return [r, 3];
  if (niveauMax < 4) return [RIEN, 0];
  r = hypothese(ctx, etat);
  if (r !== RIEN) return [r, 4];
  return [RIEN, 0];
}

/** Déductions répétées jusqu'au blocage, à la solution ou à l'impasse. */
function propager(ctx, etat, niveauMax) {
  for (;;) {
    if (etat.marmottes.length === ctx.n) return PROGRES;
    const [r] = etape(ctx, etat, niveauMax);
    if (r === IMPASSE) return IMPASSE;
    if (r === RIEN) return RIEN;
  }
}

/** 4. Hypothèse courte : une marmotte ici mène-t-elle à une impasse par les déductions 1-2 ? */
function hypothese(ctx, etat) {
  for (let x = 0; x < ctx.nn; x++) {
    if (!etat.possible[x]) continue;
    const essai = copier(etat);
    poser(ctx, essai, x);
    if (propager(ctx, essai, 2) === IMPASSE) {
      etat.possible[x] = 0;
      return PROGRES;
    }
  }
  return RIEN;
}

/**
 * Résout le puzzle par déductions. Renvoie { resolu, niveau, etapes, solution } :
 *   - resolu : toutes les marmottes trouvées sans deviner ;
 *   - niveau : déduction la plus difficile utilisée (1 à 4), 0 si non résolu ;
 *   - etapes : nombre de déductions de chaque niveau (index 1 à 4) ;
 *   - solution : colonne de la marmotte de chaque ligne (-1 si pas trouvée).
 */
export function resoudreParDeduction(puzzle) {
  const ctx = preparer(puzzle);
  const etat = nouvelEtat(ctx);
  const etapes = [0, 0, 0, 0, 0];
  let niveau = 0;
  while (etat.marmottes.length < ctx.n) {
    const [r, nv] = etape(ctx, etat, 4);
    if (r !== PROGRES) { niveau = 0; break; }
    etapes[nv]++;
    niveau = Math.max(niveau, nv);
  }
  const solution = new Array(ctx.n).fill(-1);
  for (const i of etat.marmottes) solution[Math.floor(i / ctx.n)] = i % ctx.n;
  return { resolu: niveau > 0, niveau, etapes, solution };
}

/** Niveau ('facile' … 'expert') d'un puzzle, ou null s'il faut deviner. */
export function niveauDe(puzzle) {
  const { resolu, niveau } = resoudreParDeduction(puzzle);
  return resolu ? NIVEAUX[niveau - 1] : null;
}
