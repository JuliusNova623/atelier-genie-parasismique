import { useSyncExternalStore } from 'react';
import { useSettings, type DisplayPref } from '../store/settings';

/** Grand écran en paysage (ordinateur / TV / projecteur) : mise en page « écran » en mode Auto. */
export const WIDE_QUERY = '(min-width: 1000px) and (min-aspect-ratio: 4/3)';

export function resolveDisplay(pref: DisplayPref, wide: boolean): 'tv' | 'phone' {
  if (pref === 'tv') return 'tv';
  if (pref === 'phone') return 'phone';
  return wide ? 'tv' : 'phone';
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const isWide = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(WIDE_QUERY).matches;

/** Vrai quand l'interface doit s'afficher en mode écran (TV / projecteur). */
export function useIsTv(): boolean {
  const pref = useSettings((s) => s.display);
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  return resolveDisplay(pref, wide) === 'tv';
}
