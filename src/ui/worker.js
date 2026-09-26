// Calcule les puzzles hors du fil principal : l'écran reste fluide pendant la génération.

import { puzzleFor } from '../engine/daily.js';

self.onmessage = ({ data }) => {
  const { id, ...demande } = data;
  try {
    self.postMessage({ id, puzzle: puzzleFor(demande) });
  } catch (e) {
    self.postMessage({ id, erreur: String(e?.message ?? e) });
  }
};
