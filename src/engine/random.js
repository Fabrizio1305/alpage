// Aléatoire déterministe : même graine → même suite de nombres, sur tout appareil.
// Indispensable pour le puzzle du jour (calculé à partir de la date, sans serveur).

/** Hachage FNV-1a 32 bits d'une chaîne → entier non signé. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Générateur mulberry32 : rapide, suffisant pour un jeu. */
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** Réel dans [0, 1). */
    next,
    /** Entier dans [0, n). */
    int: (n) => Math.floor(next() * n),
    /** Mélange le tableau sur place (Fisher-Yates) et le renvoie. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}
