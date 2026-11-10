import { createDeck } from './deck';
import { createGame } from './game';
import {
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  drinkCountOf,
  refuseCard,
  revealPending,
} from './turn';
import { DEFAULT_RULES, type Game, type Player, type Rules } from './types';

const mk = (id: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

const toDrinkStage = (rules: Rules): Game => {
  const g = createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a'), mk('b')],
    rules,
    themes: [{ id: 't', cardNumbers: createDeck(20) }],
  });
  return refuseCard(revealPending(drawCardNumber(revealPending(drawTheme(g)))));
};

const chi = (counts: number[], expected: number) =>
  counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);

describe('nombre de boissons', () => {
  it('vaut 20 par défaut et pour une ancienne partie sans ce champ', () => {
    expect(drinkCountOf(toDrinkStage(DEFAULT_RULES))).toBe(20);
    const old = toDrinkStage({ ...DEFAULT_RULES });
    delete (old.rules as { drinkCount?: number }).drinkCount;
    expect(drinkCountOf(old)).toBe(20);
  });

  it('est borné à 1..20', () => {
    for (const [n, expected] of [
      [0, 1],
      [-4, 1],
      [7.9, 7],
      [99, 20],
    ] as const) {
      expect(drinkCountOf(toDrinkStage({ ...DEFAULT_RULES, drinkCount: n }))).toBe(expected);
    }
  });

  it('tire uniformément sur 1..N, avec remise, jamais au-delà de N', () => {
    for (const n of [1, 2, 5, 12, 20]) {
      const base = toDrinkStage({ ...DEFAULT_RULES, drinkCount: n });
      const counts = new Array(n).fill(0);
      const draws = n * 1500;
      for (let i = 0; i < draws; i++) {
        const d = drawDrinkNumber(base).pending!.drinkNumber!;
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(n);
        counts[d - 1]++;
      }
      expect(Math.min(...counts), `n=${n}`).toBeGreaterThan(0);
      // χ² : seuil généreux (p < 1e-5) pour (n-1) degrés de liberté.
      if (n > 1) expect(chi(counts, draws / n)).toBeLessThan(25 + 4 * n);
    }
  });

  it('avec une seule boisson, c’est toujours la n°1 (la même peut retomber)', () => {
    const base = toDrinkStage({ ...DEFAULT_RULES, drinkCount: 1 });
    for (let i = 0; i < 50; i++) expect(drawDrinkNumber(base).pending!.drinkNumber).toBe(1);
  });

  it('survit à un rechargement JSON de la partie', () => {
    const g = toDrinkStage({ ...DEFAULT_RULES, drinkCount: 6 });
    const restored = JSON.parse(JSON.stringify(g)) as Game;
    expect(drinkCountOf(restored)).toBe(6);
  });
});
