import type { Game } from './types';

export const MAX_DRINKS = 20;
export const DRINK_COUNT = MAX_DRINKS;

/** Nombre de boissons de la partie (borné à 1..20 ; 20 si la partie n'en précise pas). */
export function drinkCountOf(game: Game): number {
  const n = game.rules.drinkCount ?? MAX_DRINKS;
  return Math.min(MAX_DRINKS, Math.max(1, Math.trunc(n)));
}
