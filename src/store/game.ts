import { create } from 'zustand';
import { repo } from '../db/repo';
import { recordTurn } from '../engine/game';
import { drawCardNumber, drawTheme, rememberPickerMode, revealPending } from '../engine/turn';
import type { Game, PickerMode } from '../engine/types';

interface GameState {
  game: Game | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Remplace la partie en cours et la sauvegarde (appelé après chaque événement). */
  setGame: (game: Game) => Promise<void>;
  clear: () => Promise<void>;
  /** Tire le thème (résultat fixé et sauvegardé AVANT l'animation de la roue). */
  spinTheme: () => Promise<void>;
  /** Tire le numéro de carte (résultat fixé et sauvegardé AVANT l'animation du sélecteur). */
  spinCard: () => Promise<void>;
  /** Fin d'animation : le résultat devient visible. */
  reveal: () => Promise<void>;
  selectPickerMode: (mode: PickerMode) => Promise<void>;
  /** Provisoire (étape 5) : valide la carte comme réalisée. Remplacé par la page de carte (étape 6). */
  completeCardTemp: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => {
  const apply = async (fn: (g: Game) => Game) => {
    const g = get().game;
    if (!g) return;
    const next = fn(g);
    if (next !== g) await get().setGame(next);
  };

  return {
    game: null,
    loaded: false,
    async load() {
      const game = (await repo.loadCurrentGame()) ?? null;
      set({
        game: game && !game.endedAt ? { ...game, pending: game.pending ?? null } : null,
        loaded: true,
      });
    },
    async setGame(game) {
      set({ game });
      await repo.saveCurrentGame(game);
    },
    async clear() {
      set({ game: null });
      await repo.clearCurrentGame();
    },
    spinTheme: () => apply((g) => (g.pending ? g : drawTheme(g))),
    spinCard: () =>
      apply((g) => (g.pending?.stage === 'theme' && g.pending.revealed ? drawCardNumber(g) : g)),
    reveal: () => apply(revealPending),
    selectPickerMode: (mode) =>
      apply((g) => (g.pending?.stage === 'card' ? g : rememberPickerMode(g, mode))),
    completeCardTemp: () =>
      apply((g) => {
        const p = g.pending;
        if (!p || p.stage !== 'card' || !p.revealed || p.cardNumber === undefined) return g;
        return recordTurn(
          g,
          { themeId: p.themeId, cardNumber: p.cardNumber, outcome: 'done' },
          Date.now(),
        );
      }),
  };
});
