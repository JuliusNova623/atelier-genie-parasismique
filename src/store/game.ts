import { create } from 'zustand';
import { repo } from '../db/repo';
import { undoLast } from '../engine/game';
import {
  armJoker,
  completeCard,
  disarmJoker,
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  playPass,
  refuseCard,
  rememberPickerMode,
  resolveDrink,
  revealPending,
} from '../engine/turn';
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
  /** Tire la boisson (avec remise), idem. */
  spinDrink: () => Promise<void>;
  /** Fin d'animation : le résultat devient visible. */
  reveal: () => Promise<void>;
  selectPickerMode: (mode: PickerMode) => Promise<void>;
  completeCard: () => Promise<void>;
  refuseCard: () => Promise<void>;
  playPass: () => Promise<void>;
  armJoker: (joker: 'double' | 'transfer', transferTo?: string) => Promise<void>;
  disarmJoker: () => Promise<void>;
  resolveDrink: (drank: boolean) => Promise<void>;
  undo: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => {
  /**
   * Applique une transition du moteur. Les transitions invalides (double tap, état périmé)
   * lèvent une erreur dans le moteur : on les ignore pour qu'un second clic reste sans effet.
   */
  const apply = async (fn: (g: Game) => Game) => {
    const g = get().game;
    if (!g) return;
    let next: Game;
    try {
      next = fn(g);
    } catch (e) {
      console.warn('Action ignorée :', e instanceof Error ? e.message : e);
      return;
    }
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
    spinDrink: () => apply((g) => drawDrinkNumber(g)),
    reveal: () => apply(revealPending),
    selectPickerMode: (mode) =>
      apply((g) => {
        const p = g.pending;
        const busy =
          p && (p.stage === 'card' || (p.stage === 'drink' && p.drinkNumber !== undefined));
        return busy ? g : rememberPickerMode(g, mode);
      }),
    completeCard: () => apply((g) => completeCard(g, Date.now())),
    refuseCard: () => apply((g) => refuseCard(g)),
    playPass: () => apply((g) => playPass(g, Date.now())),
    armJoker: (joker, transferTo) => apply((g) => armJoker(g, joker, transferTo)),
    disarmJoker: () => apply((g) => disarmJoker(g)),
    resolveDrink: (drank) => apply((g) => resolveDrink(g, drank, Date.now())),
    undo: () => apply((g) => undoLast(g)),
  };
});
