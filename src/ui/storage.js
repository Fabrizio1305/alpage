// Stockage local (localStorage) : partie en cours et statistiques.
// Chaque accès est protégé : navigation privée ou stockage bloqué ne cassent pas le jeu.

const CLE_PARTIE = 'alpage.partie';
const CLE_STATS = 'alpage.stats';
const CLE_REGLAGES = 'alpage.reglages';

function lire(cle) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

function ecrire(cle, valeur) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage indisponible : on joue sans sauvegarde.
  }
}

export const chargerPartie = () => lire(CLE_PARTIE);
export const sauvegarderPartie = (partie) => ecrire(CLE_PARTIE, partie);

export function chargerStats() {
  return lire(CLE_STATS) ?? { reussis: 0, meilleurs: {}, jour: { derniere: null, serie: 0 } };
}

/** Clé de la veille d'une clé de date AAAA-MM-JJ. */
function veille(cle) {
  const [y, m, d] = cle.split('-').map(Number);
  const v = new Date(y, m - 1, d - 1);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
}

/** Série quotidienne en cours : 0 si la dernière réussite date d'avant-hier ou plus. */
export function serieCourante(stats, aujourdhui) {
  const { derniere, serie } = stats.jour;
  return derniere === aujourdhui || derniere === veille(aujourdhui) ? serie : 0;
}

/**
 * Enregistre une victoire. `cleJour` est la date du puzzle du jour (null en partie libre).
 * Le puzzle du jour ne compte qu'une fois par date. Une victoire en mode zen compte pour la
 * série et les réussites, pas pour les records.
 */
export function enregistrerVictoire({ size, temps, cleJour, zen = false }) {
  const stats = chargerStats();
  if (cleJour) {
    if (stats.jour.derniere === cleJour) return stats;
    stats.jour.serie = stats.jour.derniere === veille(cleJour) ? stats.jour.serie + 1 : 1;
    stats.jour.derniere = cleJour;
  }
  stats.reussis += 1;
  if (!zen && (!stats.meilleurs[size] || temps < stats.meilleurs[size])) stats.meilleurs[size] = temps;
  ecrire(CLE_STATS, stats);
  return stats;
}

export const REGLAGES_DEFAUT = { autoCroix: false, zen: false, motifs: false, tutoVu: false, v: 2 };

export function chargerReglages() {
  const stocke = lire(CLE_REGLAGES) ?? {};
  // Avant la v2, « croix automatiques » était actif par défaut et enregistré tel quel :
  // on oublie cette valeur pour appliquer le nouveau défaut (désactivé).
  if (!stocke.v) delete stocke.autoCroix;
  return { ...REGLAGES_DEFAUT, ...stocke, v: 2 };
}

export const sauvegarderReglages = (reglages) => ecrire(CLE_REGLAGES, reglages);
