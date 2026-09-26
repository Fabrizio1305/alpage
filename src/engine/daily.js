// Puzzle du jour : dérivé de la date locale, identique pour tout le monde, sans serveur.

import { hashString } from './random.js';
import { generatePuzzle } from './generator.js';

/** Taille de la grille selon le jour de la semaine, du lundi (index 0) au dimanche. */
const SIZE_BY_WEEKDAY = [6, 7, 7, 8, 8, 9, 9];

/** Clé de date locale au format AAAA-MM-JJ. */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Graine déterministe pour une clé de date. */
export function dailySeed(key) {
  return hashString(`alpage-${key}`);
}

/** Taille du puzzle du jour pour une clé de date. */
export function dailySize(key) {
  const [y, m, d] = key.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // lundi = 0
  return SIZE_BY_WEEKDAY[weekday];
}

/** Puzzle du jour pour une clé de date (par défaut : aujourd'hui). */
export function dailyPuzzle(key = dateKey()) {
  return generatePuzzle(dailySize(key), dailySeed(key));
}

/**
 * Puzzle correspondant à une demande de l'interface :
 * { type: 'jour', cle } ou { type: 'libre', size, seed }.
 */
export function puzzleFor({ type, cle, size, seed }) {
  return type === 'jour' ? dailyPuzzle(cle) : generatePuzzle(size, seed);
}
