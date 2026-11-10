import { create } from 'zustand';
import { repo } from '../db/repo';
import type { Game } from '../engine/types';

interface GameState {
  game: Game | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Remplace la partie en cours et la sauvegarde (appelé après chaque événement). */
  setGame: (game: Game) => Promise<void>;
  clear: () => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  game: null,
  loaded: false,
  async load() {
    const game = (await repo.loadCurrentGame()) ?? null;
    set({ game: game && !game.endedAt ? game : null, loaded: true });
  },
  async setGame(game) {
    set({ game });
    await repo.saveCurrentGame(game);
  },
  async clear() {
    set({ game: null });
    await repo.clearCurrentGame();
  },
}));
