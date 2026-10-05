// Puzzle du jour : dérivé de la date locale, identique pour tout le monde, sans serveur.

import { hashString } from './random.js';
import { generatePuzzle } from './generator.js';

/** Taille et niveau selon le jour de la semaine, du lundi (index 0) au dimanche. */
const SIZE_BY_WEEKDAY = [6, 7, 7, 8, 8, 9, 9];
const NIVEAU_BY_WEEKDAY = ['moyen', 'difficile', 'difficile', 'difficile', 'expert', 'expert', 'expert'];

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

function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7; // lundi = 0
}

/** Taille du puzzle du jour pour une clé de date. */
export function dailySize(key) {
  return SIZE_BY_WEEKDAY[weekday(key)];
}

/** Niveau du puzzle du jour pour une clé de date. */
export function dailyNiveau(key) {
  return NIVEAU_BY_WEEKDAY[weekday(key)];
}

/** Puzzle du jour pour une clé de date (par défaut : aujourd'hui). */
export function dailyPuzzle(key = dateKey()) {
  return generatePuzzle(dailySize(key), dailySeed(key), dailyNiveau(key));
}

/**
 * Puzzle correspondant à une demande de l'interface :
 * { type: 'jour', cle } ou { type: 'libre', size, seed, niveau }.
 */
export function puzzleFor({ type, cle, size, seed, niveau = null }) {
  return type === 'jour' ? dailyPuzzle(cle) : generatePuzzle(size, seed, niveau);
}
