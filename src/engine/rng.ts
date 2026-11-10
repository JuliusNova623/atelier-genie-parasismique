/**
 * Moteur de hasard : aucune utilisation de Math.random().
 * La source par défaut est crypto.getRandomValues (aléa cryptographique, jamais de graine fixe).
 */

/** Source d'entiers non signés 32 bits uniformes. Injectable pour les tests uniquement. */
export type Uint32Source = () => number;

const TWO_32 = 0x1_0000_0000;

export const cryptoUint32: Uint32Source = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
};

/**
 * Entier uniforme dans [0, maxExclusive), sans biais du modulo :
 * on rejette les valeurs >= plus grand multiple de maxExclusive tenant sur 32 bits.
 */
export function randomInt(maxExclusive: number, source: Uint32Source = cryptoUint32): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > TWO_32) {
    throw new RangeError(`randomInt: borne invalide (${maxExclusive})`);
  }
  if (maxExclusive === 1) return 0;
  const limit = TWO_32 - (TWO_32 % maxExclusive);
  let x = source();
  while (x >= limit) x = source();
  return x % maxExclusive;
}

/** Entier uniforme dans [min, max] inclus. */
export function randomRange(min: number, max: number, source?: Uint32Source): number {
  return min + randomInt(max - min + 1, source);
}

/** Mélange de Fisher–Yates (renvoie une nouvelle liste). */
export function shuffle<T>(items: readonly T[], source?: Uint32Source): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, source);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Élément uniforme d'une liste non vide. */
export function pickOne<T>(items: readonly T[], source?: Uint32Source): T {
  if (items.length === 0) throw new RangeError('pickOne: liste vide');
  return items[randomInt(items.length, source)];
}
