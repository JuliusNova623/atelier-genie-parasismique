import { finalRotation } from '../components/ThemeWheel';
import { slotDelay, slotSequence } from './anim';

describe('slotSequence', () => {
  it('se termine exactement sur la cible, pour tous les départs et cibles', () => {
    for (let start = 1; start <= 20; start++) {
      for (let target = 1; target <= 20; target++) {
        const seq = slotSequence(20, target, start);
        expect(seq[seq.length - 1]).toBe(target);
        expect(seq.length).toBeGreaterThanOrEqual(24);
        expect(seq.length).toBeLessThan(24 + 20);
        expect(seq.every((v) => v >= 1 && v <= 20)).toBe(true);
      }
    }
  });

  it('compte de façon continue en bouclant sur 1..max', () => {
    const seq = slotSequence(20, 3, 18);
    expect(seq[0]).toBe(19); // la première valeur affichée suit le départ
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBe((seq[i - 1] % 20) + 1);
    }
  });

  it('ralentit progressivement', () => {
    const total = 30;
    const delays = Array.from({ length: total }, (_, i) => slotDelay(i, total));
    expect(delays[0]).toBeLessThan(delays[total - 1]);
    for (let i = 1; i < total; i++) expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
  });
});

describe('finalRotation de la roue', () => {
  it('amène toujours le secteur visé sous le pointeur, quelle que soit la position de départ', () => {
    const n = 10;
    for (let from = -700; from <= 1500; from += 137) {
      for (let index = 0; index < n; index++) {
        for (const jitter of [-12, 0, 12]) {
          const to = finalRotation(from, index, n, 5, jitter);
          expect(to).toBeGreaterThanOrEqual(from + 5 * 360);
          const center = index * 36 + 18 + jitter;
          const under = (((center + to) % 360) + 360) % 360;
          // Le pointeur (0°) doit rester dans le secteur : écart ≤ 12° du centre de la marque.
          expect(Math.min(under, 360 - under)).toBeLessThan(1e-6);
          // Et le secteur visé contient bien le pointeur (centre ± 18°).
          const offset = (((index * 36 + 18 + to) % 360) + 360) % 360;
          expect(Math.min(offset, 360 - offset)).toBeLessThanOrEqual(12.0001);
        }
      }
    }
  });
});
