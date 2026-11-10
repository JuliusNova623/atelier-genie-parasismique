import { pickOne, type Uint32Source } from './rng';

/** Paquet d'un thème : numéros encore disponibles. */
export function createDeck(size = 20): number[] {
  return Array.from({ length: size }, (_, i) => i + 1);
}

/** Tirage SANS remise parmi les numéros restants. Pur : renvoie le nouveau paquet. */
export function drawFromDeck(
  remaining: readonly number[],
  source?: Uint32Source,
): { number: number; remaining: number[] } {
  const n = pickOne(remaining, source);
  return { number: n, remaining: remaining.filter((x) => x !== n) };
}

/** Tirage AVEC remise, uniforme sur 1..max (boissons). */
export function drawWithReplacement(max: number, source?: Uint32Source): number {
  return pickOne(createDeck(max), source);
}
