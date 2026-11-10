import { useEffect } from 'react';
import type { Game } from '../../engine/types';
import { useGameStore } from '../../store/game';
import { toggleFullscreen } from '../../util/fullscreen';

export type PlayScreen = 'wheel' | 'theme' | 'card' | 'drink';

/** Quel écran de jeu est affiché, d'après l'état de la partie (même logique que le routeur de jeu). */
export function screenOf(game: Game): PlayScreen {
  const p = game.pending;
  if (!p || (p.stage === 'theme' && !p.revealed)) return 'wheel';
  if (p.stage === 'drink') return 'drink';
  if (p.stage === 'card' && p.revealed) return 'card';
  return 'theme';
}

type Actions = Record<string, () => void>;

/** Actions déclenchées par le clavier selon l'écran. Espace = l'action principale. */
export function hotkeysFor(game: Game): Actions {
  const s = useGameStore.getState();
  const screen = screenOf(game);
  const p = game.pending;
  switch (screen) {
    case 'wheel':
      return { space: () => void s.spinTheme() };
    case 'theme':
      return { space: () => void s.spinCard() };
    case 'card':
      return {
        space: () => void s.completeCard(),
        r: () => void s.refuseCard(),
        p: () => void s.playPass(),
      };
    case 'drink':
      if (p?.drinkNumber === undefined) return { space: () => void s.spinDrink() };
      return {
        space: () => void s.resolveDrink(true),
        b: () => void s.resolveDrink(true),
        n: () => void s.resolveDrink(false),
      };
  }
}

/**
 * Raccourcis clavier pour jouer sur grand écran : Espace (action principale), R (refus),
 * P (passe), B / N (boisson), F (plein écran). Ignorés pendant la saisie de texte ou si un panneau est ouvert.
 */
export function usePlayHotkeys(game: Game | null): void {
  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;

      const key = e.code === 'Space' ? 'space' : e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }
      const action = hotkeysFor(game)[key];
      if (!action) return;
      // Espace ne doit pas aussi « cliquer » le bouton resté sélectionné.
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);
}
