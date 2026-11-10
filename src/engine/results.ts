import { createGame, playerScores, teamScores } from './game';
import type { Game } from './types';

export interface Ranked {
  id: string;
  score: number;
  /** Rang « compétition » : les ex æquo partagent le même rang (1, 1, 3…). */
  rank: number;
}

/** Classement par score décroissant ; l'ordre d'origine départage l'affichage, pas le rang. */
export function rankScores(scores: Record<string, number>, order: string[]): Ranked[] {
  const sorted = order
    .map((id, i) => ({ id, score: scores[id] ?? 0, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const out: Ranked[] = [];
  sorted.forEach((x, idx) => {
    const tied = idx > 0 && out[idx - 1].score === x.score;
    out.push({ id: x.id, score: x.score, rank: tied ? out[idx - 1].rank : idx + 1 });
  });
  return out;
}

export interface GameResults {
  players: Ranked[];
  teams: Ranked[] | null;
  /** Gagnants (ex æquo possibles) : équipes en mode équipes, sinon joueurs. */
  winnerIds: string[];
}

export function buildResults(game: Game): GameResults {
  const players = rankScores(
    playerScores(game),
    game.players.map((p) => p.id),
  );
  const teams =
    game.mode === 'teams' && game.teams.length > 0
      ? rankScores(
          teamScores(game),
          game.teams.map((t) => t.id),
        )
      : null;
  const top = teams ?? players;
  return { players, teams, winnerIds: top.filter((x) => x.rank === 1).map((x) => x.id) };
}

/** « Rejouer avec les mêmes joueurs » : mêmes joueurs, équipes, règles et ordre ; scores remis à zéro. */
export function replayGame(game: Game, now: number): Game {
  return createGame({
    now,
    mode: game.mode,
    players: game.players,
    teams: game.teams,
    rules: game.rules,
    themes: game.themeIds.map((id) => ({
      id,
      cardNumbers: game.themeCards[id] ?? [],
    })),
    turnOrder: game.turnOrder,
  });
}

/** Marque la partie terminée (la suite du journal reste intacte pour les stats). */
export function endGame(game: Game, now: number): Game {
  return { ...game, endedAt: now, pending: null };
}
