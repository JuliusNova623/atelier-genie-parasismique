import { useRef } from 'react';

/**
 * Suite de valeurs affichées par la machine à sous : démarre à `start`, compte en boucle
 * sur 1..max et se termine EXACTEMENT sur `target`. Purement visuel : le résultat vient du moteur.
 */
export function slotSequence(max: number, target: number, start: number, minTicks = 24): number[] {
  const mod = (a: number) => ((a % max) + max) % max;
  const ticks = minTicks + mod(target - start - minTicks);
  const seq: number[] = [];
  for (let i = 1; i <= ticks; i++) seq.push(mod(start - 1 + i) + 1);
  return seq;
}

/** Délai (ms) avant la i-ème valeur : rapide au début, de plus en plus lent. */
export function slotDelay(i: number, total: number): number {
  const x = total <= 1 ? 1 : i / (total - 1);
  return Math.round(45 + x ** 3 * 380);
}

/** Évite les doubles déclenchements (double tap, tap + swipe) : un seul appel tant que target est null. */
export function useOnceTrigger(onTrigger: () => void, target: number | null) {
  const fired = useRef(false);
  return () => {
    if (fired.current || target !== null) return;
    fired.current = true;
    onTrigger();
  };
}
