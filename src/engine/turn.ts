import { currentPlayerId, exhaustedThemes, remainingCards } from './game';
import { pickOne, type Uint32Source } from './rng';
import type { Game, PickerMode } from './types';

/** Thèmes encore jouables (au moins une carte restante). */
export function availableThemes(game: Game): string[] {
  const exhausted = new Set(exhaustedThemes(game));
  return game.themeIds.filter((id) => !exhausted.has(id));
}

/**
 * Tire le thème AVANT l'animation (uniforme parmi les thèmes non épuisés) et le fixe dans la partie.
 * L'animation de la roue ne fait que s'arrêter dessus.
 */
export function drawTheme(game: Game, source?: Uint32Source): Game {
  if (game.pending) throw new Error('Un tirage est déjà en cours.');
  const themes = availableThemes(game);
  if (themes.length === 0) throw new Error('Tous les thèmes sont épuisés.');
  return {
    ...game,
    pending: { stage: 'theme', themeId: pickOne(themes, source), revealed: false },
  };
}

/**
 * Tire le numéro de carte AVANT l'animation, uniformément parmi les numéros restants du thème
 * (tirage sans remise : un numéro déjà joué ne peut jamais sortir).
 */
export function drawCardNumber(game: Game, source?: Uint32Source): Game {
  const p = game.pending;
  if (!p || p.stage !== 'theme' || !p.revealed) throw new Error('Choisissez d’abord un thème.');
  const remaining = remainingCards(game, p.themeId);
  if (remaining.length === 0) throw new Error('Ce thème est épuisé.');
  return {
    ...game,
    pending: {
      stage: 'card',
      themeId: p.themeId,
      cardNumber: pickOne(remaining, source),
      revealed: false,
    },
  };
}

/** Fin d'animation : le résultat devient visible et l'écran suivant s'affiche. */
export function revealPending(game: Game): Game {
  if (!game.pending || game.pending.revealed) return game;
  return { ...game, pending: { ...game.pending, revealed: true } };
}

/** Mémorise le mode de tirage du joueur actif pour le préselectionner la prochaine fois. */
export function rememberPickerMode(game: Game, mode: PickerMode): Game {
  const id = currentPlayerId(game);
  if (game.pickerModes?.[id] === mode) return game;
  return { ...game, pickerModes: { ...game.pickerModes, [id]: mode } };
}

export function pickerModeFor(game: Game, playerId = currentPlayerId(game)): PickerMode {
  return game.pickerModes?.[playerId] ?? 'dice';
}

/** Numéros déjà joués dans un thème (« grillés »). */
export function playedCards(game: Game, themeId: string): number[] {
  const remaining = new Set(remainingCards(game, themeId));
  return (game.themeCards[themeId] ?? []).filter((n) => !remaining.has(n));
}
