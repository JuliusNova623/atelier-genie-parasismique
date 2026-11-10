import { createDeck, drawFromDeck, drawWithReplacement } from './deck';
import { randomInt, shuffle } from './rng';

/**
 * Test du χ² : seuil 55 pour 19 degrés de liberté (p ≈ 1e-5).
 * Un générateur correct dépasse ce seuil avec une probabilité négligeable ;
 * un biais notable (modulo, bucket favorisé) le dépasse.
 */
function chiSquare(counts: number[], expected: number): number {
  return counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
}

describe('randomInt', () => {
  it('est uniforme sur 20 valeurs (100 000 tirages, χ² < 55)', () => {
    const counts = new Array(20).fill(0);
    for (let i = 0; i < 100_000; i++) counts[randomInt(20)]++;
    expect(chiSquare(counts, 5000)).toBeLessThan(55);
  });

  it('est uniforme pour N non puissance de 2 (N=7, χ² 6 ddl < 35)', () => {
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 70_000; i++) counts[randomInt(7)]++;
    expect(chiSquare(counts, 10_000)).toBeLessThan(35);
  });

  it('rejette les valeurs du dernier bloc incomplet (pas de biais du modulo)', () => {
    // N=3 : 2^32 mod 3 = 1, donc 4294967295 doit être rejeté.
    const feed = [0xffffffff, 0xffffffff, 5];
    const calls: number[] = [];
    const r = randomInt(3, () => {
      const v = feed.shift()!;
      calls.push(v);
      return v;
    });
    expect(calls).toEqual([0xffffffff, 0xffffffff, 5]);
    expect(r).toBe(5 % 3);
  });

  it('accepte la dernière valeur valide', () => {
    expect(randomInt(3, () => 0xfffffffe)).toBe(0xfffffffe % 3);
  });

  it('refuse les bornes invalides', () => {
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
    expect(randomInt(1)).toBe(0);
  });

  it('reste dans [0, N)', () => {
    for (let i = 0; i < 5000; i++) {
      const v = randomInt(20);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(20);
    }
  });
});

describe('shuffle', () => {
  it("renvoie une permutation valide sans modifier l'original", () => {
    const players = ['A', 'B', 'C', 'D', 'E', 'F'];
    const copy = [...players];
    const s = shuffle(players);
    expect(players).toEqual(copy);
    expect([...s].sort()).toEqual(copy);
  });

  it('place chaque élément à chaque position avec une fréquence uniforme', () => {
    const n = 4;
    const runs = 40_000;
    const pos = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < runs; i++) shuffle([0, 1, 2, 3]).forEach((v, p) => pos[v][p]++);
    for (const row of pos) expect(chiSquare(row, runs / n)).toBeLessThan(25);
  });
});

describe('tirage sans remise', () => {
  it('ne renvoie jamais deux fois le même numéro et épuise exactement 20 cartes', () => {
    for (let game = 0; game < 200; game++) {
      let deck = createDeck(20);
      const seen = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const r = drawFromDeck(deck);
        expect(seen.has(r.number)).toBe(false);
        expect(r.number).toBeGreaterThanOrEqual(1);
        expect(r.number).toBeLessThanOrEqual(20);
        seen.add(r.number);
        deck = r.remaining;
      }
      expect(seen.size).toBe(20);
      expect(deck).toHaveLength(0);
      expect(() => drawFromDeck(deck)).toThrow();
    }
  });

  it('deux parties successives ont des séquences différentes', () => {
    const seq = () => {
      let d = createDeck(20);
      const out: number[] = [];
      while (d.length) {
        const r = drawFromDeck(d);
        out.push(r.number);
        d = r.remaining;
      }
      return out.join(',');
    };
    expect(seq()).not.toBe(seq());
  });
});

describe('tirage avec remise (boissons)', () => {
  it('est uniforme sur 1..20 et répète parfois la même valeur', () => {
    const counts = new Array(20).fill(0);
    let repeats = 0;
    let prev = 0;
    for (let i = 0; i < 100_000; i++) {
      const v = drawWithReplacement(20);
      counts[v - 1]++;
      if (v === prev) repeats++;
      prev = v;
    }
    expect(chiSquare(counts, 5000)).toBeLessThan(55);
    expect(repeats).toBeGreaterThan(0);
  });
});
