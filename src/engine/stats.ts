import { playerScores } from './game';
import type { Game } from './types';

export interface PlayerStats {
  playerId: string;
  score: number;
  done: number;
  refused: number;
  drunk: number;
  noDrink: number;
  passes: number;
  bestStreak: number;
}

export interface GameStats {
  players: PlayerStats[];
  totals: { done: number; refused: number; drunk: number; noDrink: number };
  /** Plus de cartes faites / plus de boissons bues / plus de refus. */
  bravest: string | null;
  biggestDrinker: string | null;
  biggestQuitter: string | null;
  bestStreak: { playerId: string; length: number } | null;
}

type NumericKey = 'done' | 'refused' | 'drunk' | 'noDrink' | 'bestStreak';

function top(stats: PlayerStats[], key: NumericKey): string | null {
  const best = [...stats].sort((a, b) => b[key] - a[key])[0];
  return best && best[key] > 0 ? best.playerId : null;
}

export function computeStats(game: Game): GameStats {
  const scores = playerScores(game);
  const players: PlayerStats[] = game.players.map((p) => {
    const mine = game.log.filter((e) => e.playerId === p.id && e.outcome !== 'joker-pass');
    let streak = 0;
    let best = 0;
    for (const e of game.log.filter((x) => x.playerId === p.id)) {
      if (e.outcome === 'done' || e.outcome === 'duel') best = Math.max(best, ++streak);
      else if (e.outcome !== 'joker-pass') streak = 0;
    }
    return {
      playerId: p.id,
      score: scores[p.id],
      done: mine.filter((e) => e.outcome === 'done' || e.outcome === 'duel').length,
      refused: mine.filter((e) => e.outcome.startsWith('refused')).length,
      drunk: mine.filter((e) => e.outcome === 'refused-drink').length,
      noDrink: mine.filter((e) => e.outcome === 'refused-no-drink').length,
      passes: game.log.filter((e) => e.turnOwnerId === p.id && e.outcome === 'joker-pass').length,
      bestStreak: best,
    };
  });
  const sum = (k: 'done' | 'refused' | 'drunk' | 'noDrink') =>
    players.reduce((s, p) => s + p[k], 0);
  const bs = [...players].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  return {
    players,
    totals: {
      done: sum('done'),
      refused: sum('refused'),
      drunk: sum('drunk'),
      noDrink: sum('noDrink'),
    },
    bravest: top(players, 'done'),
    biggestDrinker: top(players, 'drunk'),
    biggestQuitter: top(players, 'refused'),
    bestStreak: bs && bs.bestStreak > 0 ? { playerId: bs.playerId, length: bs.bestStreak } : null,
  };
}
