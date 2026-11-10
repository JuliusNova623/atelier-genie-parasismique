import { isAllExhausted, playerScores, teamScores, turnsPlayed } from './game';
import type { Game } from './types';

export type EndReason = 'rounds' | 'score' | 'time' | 'exhausted';

/** Conditions de fin atteintes (vide = la partie continue). */
export function endReasons(game: Game, now: number): EndReason[] {
  const out: EndReason[] = [];
  const { maxRounds, targetScore, durationMinutes } = game.rules.end;
  if (maxRounds && Object.values(turnsPlayed(game)).every((n) => n >= maxRounds)) {
    out.push('rounds');
  }
  if (targetScore) {
    const scores =
      game.mode === 'teams' ? Object.values(teamScores(game)) : Object.values(playerScores(game));
    if (scores.some((s) => s >= targetScore)) out.push('score');
  }
  if (durationMinutes && now - game.startedAt >= durationMinutes * 60_000) out.push('time');
  if (isAllExhausted(game)) out.push('exhausted');
  return out;
}
