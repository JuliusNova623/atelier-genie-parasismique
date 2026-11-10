import { create } from 'zustand';
import { repo } from '../db/repo';
import { fr } from '../i18n/fr';
import { announce } from '../util/announce';
import { playCue, type Cue } from '../util/feedback';
import { useContent } from './content';
import { drinkLabel, useSettings } from './settings';
import { undoLast } from '../engine/game';
import { endGame, replayGame } from '../engine/results';
import {
  armJoker,
  cancelDuel,
  completeCard,
  disarmJoker,
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  finishDuel,
  playPass,
  refuseCard,
  rememberPickerMode,
  resolveDrink,
  revealPending,
  startDuel,
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
  resolveDrink: () => Promise<void>;
  /** Duel : deux joueurs d'équipes différentes reçoivent la même carte. */
  startDuel: (a: string, b: string) => Promise<void>;
  cancelDuel: () => Promise<void>;
  finishDuel: (winnerId: string) => Promise<void>;
  undo: () => Promise<void>;
  /** Termine la partie : archivée dans l'historique, plus de partie en cours. Renvoie son id. */
  finishGame: () => Promise<string | null>;
  /** « Continuer » malgré une condition de fin atteinte : on ne la reproposera pas. */
  dismissEnd: (reasons: string[]) => Promise<void>;
  /** Rejouer avec les mêmes joueurs, équipes et règles. */
  replay: (finished: Game) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => {
  /**
   * Applique une transition du moteur. Les transitions invalides (double tap, état périmé)
   * lèvent une erreur dans le moteur : on les ignore pour qu'un second clic reste sans effet.
   * Renvoie true si la partie a réellement changé.
   */
  const apply = async (fn: (g: Game) => Game): Promise<boolean> => {
    const g = get().game;
    if (!g) return false;
    let next: Game;
    try {
      next = fn(g);
    } catch (e) {
      console.warn('Action ignorée :', e instanceof Error ? e.message : e);
      return false;
    }
    if (next === g) return false;
    await get().setGame(next);
    return true;
  };

  /** Applique la transition puis joue le son/la vibration associés, si elle a eu lieu. */
  const act = async (fn: (g: Game) => Game, cue?: Cue) => {
    if ((await apply(fn)) && cue) {
      const { sound, haptics } = useSettings.getState();
      playCue(cue, { sound, haptics });
    }
  };

  /** Résultat d'un tirage dit à voix haute pour les lecteurs d'écran (l'animation est visuelle). */
  const announceResult = (g: Game | null) => {
    const p = g?.pending;
    if (!p?.revealed) return;
    if (p.stage === 'theme') {
      const name = useContent.getState().content.themes.find((t) => t.id === p.themeId)?.name;
      announce(fr.a11y.themeDrawn(name ?? p.themeId));
    } else if (p.stage === 'card' && p.cardNumber !== undefined) {
      announce(fr.a11y.cardDrawn(p.cardNumber));
    } else if (p.stage === 'drink' && p.drinkNumber !== undefined) {
      announce(
        fr.a11y.drinkDrawn(p.drinkNumber, drinkLabel(useSettings.getState().drinks, p.drinkNumber)),
      );
    }
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
    spinTheme: () => act((g) => (g.pending ? g : drawTheme(g)), 'spin'),
    spinCard: () =>
      act(
        (g) => (g.pending?.stage === 'theme' && g.pending.revealed ? drawCardNumber(g) : g),
        'spin',
      ),
    spinDrink: () => act((g) => drawDrinkNumber(g), 'spin'),
    async reveal() {
      await act(revealPending, 'reveal');
      announceResult(get().game);
    },
    selectPickerMode: (mode) =>
      act((g) => {
        const p = g.pending;
        const busy =
          p && (p.stage === 'card' || (p.stage === 'drink' && p.drinkNumber !== undefined));
        return busy ? g : rememberPickerMode(g, mode);
      }),
    completeCard: () => act((g) => completeCard(g, Date.now()), 'success'),
    refuseCard: () => act((g) => refuseCard(g), 'refuse'),
    playPass: () => act((g) => playPass(g, Date.now()), 'pass'),
    armJoker: (joker, transferTo) => act((g) => armJoker(g, joker, transferTo), 'pass'),
    disarmJoker: () => act((g) => disarmJoker(g)),
    resolveDrink: () => act((g) => resolveDrink(g, Date.now()), 'drink'),
    startDuel: (a, b) => act((g) => startDuel(g, a, b), 'duel'),
    cancelDuel: () => act((g) => cancelDuel(g)),
    finishDuel: (winnerId) => act((g) => finishDuel(g, winnerId, Date.now()), 'success'),
    undo: () => act((g) => undoLast(g), 'undo'),
    async finishGame() {
      const g = get().game;
      if (!g) return null;
      const now = Date.now();
      await repo.archiveGame(endGame(g, now), now);
      set({ game: null });
      const { sound, haptics } = useSettings.getState();
      playCue('fanfare', { sound, haptics });
      return g.id;
    },
    dismissEnd: (reasons) =>
      act((g) => ({ ...g, endDismissed: [...new Set([...(g.endDismissed ?? []), ...reasons])] })),
    async replay(finished) {
      await get().setGame(replayGame(finished, Date.now()));
    },
  };
});
