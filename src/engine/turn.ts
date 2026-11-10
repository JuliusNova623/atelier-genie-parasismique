import { drawWithReplacement } from './deck';
import {
  currentPlayerId,
  exhaustedThemes,
  getPlayer,
  recordDuel,
  recordTurn,
  remainingCards,
  remainingJokers,
} from './game';
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
      deciderId: pickDecider(game, source),
      revealed: false,
    },
  };
}

/**
 * Règle « L'adversaire décide » : un joueur d'une autre équipe, désigné au hasard (uniforme),
 * tranche à la place du joueur actif. Choisi au tirage de la carte, donc sauvegardé avec lui.
 */
export function pickDecider(game: Game, source?: Uint32Source): string | undefined {
  if (game.mode !== 'teams' || !game.rules.teamRules.opponentDecides) return undefined;
  const ownerTeam = getPlayer(game, currentPlayerId(game)).teamId;
  const opponents = game.players.filter((x) => x.teamId && x.teamId !== ownerTeam);
  return opponents.length ? pickOne(opponents, source).id : undefined;
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

// ───────────────────────── Carte, jokers, boisson (étape 6) ─────────────────────────

export const MAX_DRINKS = 20;
export const DRINK_COUNT = MAX_DRINKS;

/** Nombre de boissons de la partie (borné à 1..20 ; 20 si la partie n'en précise pas). */
export function drinkCountOf(game: Game): number {
  const n = game.rules.drinkCount ?? MAX_DRINKS;
  return Math.min(MAX_DRINKS, Math.max(1, Math.trunc(n)));
}

function requireCard(game: Game) {
  const p = game.pending;
  if (!p || p.stage !== 'card' || !p.revealed || p.cardNumber === undefined) {
    throw new Error('Aucune carte à jouer.');
  }
  return p as typeof p & { cardNumber: number };
}

/** Joueur qui joue réellement la carte : le joueur désigné en cas de transfert, sinon le joueur actif. */
export function cardPlayerId(game: Game): string {
  return game.pending?.transferTo ?? currentPlayerId(game);
}

/** Arme le joker Double ou Transfert pour la carte en cours (un seul joker par carte). */
export function armJoker(game: Game, joker: 'double' | 'transfer', transferTo?: string): Game {
  const p = requireCard(game);
  if (p.duel) throw new Error('Aucun joker pendant un duel.');
  const owner = currentPlayerId(game);
  if (p.joker) throw new Error('Un joker est déjà armé.');
  if (remainingJokers(game, owner)[joker] < 1) throw new Error('Joker indisponible.');
  if (joker === 'transfer') {
    if (!transferTo || transferTo === owner || !game.players.some((x) => x.id === transferTo)) {
      throw new Error('Désignez un autre joueur.');
    }
    return { ...game, pending: { ...p, joker, transferTo } };
  }
  return { ...game, pending: { ...p, joker } };
}

/** Désarme le joker (rien n'est consommé tant que la carte n'est pas jouée). */
export function disarmJoker(game: Game): Game {
  const p = requireCard(game);
  const { joker: _joker, transferTo: _transferTo, ...rest } = p;
  void _joker;
  void _transferTo;
  return { ...game, pending: rest };
}

/** Joker Passe : saute la carte, sans boisson ni points (la carte et le joker sont consommés). */
export function playPass(game: Game, now: number): Game {
  const p = requireCard(game);
  if (p.duel) throw new Error('Aucun refus ni joker pendant un duel.');
  if (p.joker) throw new Error('Désarmez le joker avant d’utiliser Passe.');
  return recordTurn(
    game,
    { themeId: p.themeId, cardNumber: p.cardNumber, outcome: 'joker-pass', jokerUsed: 'pass' },
    now,
  );
}

/** « Je le fais / Je réponds » : points de carte (×2 avec Double) puis joueur suivant. */
export function completeCard(game: Game, now: number): Game {
  const p = requireCard(game);
  if (p.duel) throw new Error('Désignez le vainqueur du duel.');
  return recordTurn(
    game,
    {
      themeId: p.themeId,
      cardNumber: p.cardNumber,
      outcome: 'done',
      jokerUsed: p.joker,
      playerId: p.transferTo,
      deciderId: p.deciderId,
    },
    now,
  );
}

/** « Je refuse » : passe à l'étape boisson (la carte est déjà consommée pour cette partie). */
export function refuseCard(game: Game): Game {
  const p = requireCard(game);
  if (p.duel) throw new Error('Aucun refus possible en duel.');
  // Double n'a aucun effet sur un refus et n'est pas consommé.
  const joker = p.joker === 'transfer' ? 'transfer' : undefined;
  return {
    ...game,
    pending: {
      stage: 'drink',
      themeId: p.themeId,
      cardNumber: p.cardNumber,
      joker,
      transferTo: p.transferTo,
      deciderId: p.deciderId,
      revealed: false,
    },
  };
}

/** Tire la boisson AVANT l'animation : uniforme sur 1..N (N = nombre de boissons), AVEC remise. */
export function drawDrinkNumber(game: Game, source?: Uint32Source): Game {
  const p = game.pending;
  if (!p || p.stage !== 'drink' || p.drinkNumber !== undefined) {
    throw new Error('Aucune boisson à tirer.');
  }
  return {
    ...game,
    pending: {
      ...p,
      drinkNumber: drawWithReplacement(drinkCountOf(game), source),
      revealed: false,
    },
  };
}

/** « J'ai bu » (points boisson) ou « Je ne bois pas » (points négatifs), puis joueur suivant. */
export function resolveDrink(game: Game, drank: boolean, now: number): Game {
  const p = game.pending;
  if (!p || p.stage !== 'drink' || !p.revealed || p.drinkNumber === undefined) {
    throw new Error('Aucune boisson à résoudre.');
  }
  return recordTurn(
    game,
    {
      themeId: p.themeId,
      cardNumber: p.cardNumber!,
      outcome: drank ? 'refused-drink' : 'refused-no-drink',
      drinkNumber: p.drinkNumber,
      jokerUsed: p.joker === 'transfer' ? 'transfer' : undefined,
      playerId: p.transferTo,
      deciderId: p.deciderId,
    },
    now,
  );
}

// ───────────────────────── Duel (équipes) ─────────────────────────

/**
 * Le duel est disponible une fois par tour de table (un tour de table = autant de tours que de
 * joueurs), en mode équipes avec la règle activée.
 */
export function duelAvailable(game: Game): boolean {
  if (game.mode !== 'teams' || !game.rules.teamRules.duel || game.teams.length < 2) return false;
  const n = game.players.length;
  const start = Math.floor(game.log.length / n) * n;
  return !game.log.slice(start).some((e) => e.outcome === 'duel');
}

/** Deux joueurs d'équipes différentes reçoivent la même carte (choix du joueur actif). */
export function startDuel(game: Game, a: string, b: string): Game {
  const p = requireCard(game);
  if (!duelAvailable(game)) throw new Error('Duel indisponible ce tour de table.');
  if (p.joker) throw new Error('Désarmez le joker avant de lancer un duel.');
  const ta = getPlayer(game, a).teamId;
  const tb = getPlayer(game, b).teamId;
  if (!ta || !tb || ta === tb) throw new Error('Un duel oppose deux équipes différentes.');
  return { ...game, pending: { ...p, duel: { a, b } } };
}

export function cancelDuel(game: Game): Game {
  const p = requireCard(game);
  if (!p.duel) return game;
  const { duel: _duel, ...rest } = p;
  void _duel;
  return { ...game, pending: rest };
}

/** Le groupe désigne le vainqueur : +points de carte pour lui (donc son équipe), aucune boisson. */
export function finishDuel(game: Game, winnerId: string, now: number): Game {
  const p = requireCard(game);
  if (!p.duel) throw new Error('Aucun duel en cours.');
  const { a, b } = p.duel;
  if (winnerId !== a && winnerId !== b) throw new Error('Le vainqueur doit être un duelliste.');
  return recordDuel(
    game,
    { themeId: p.themeId, cardNumber: p.cardNumber, winnerId, loserId: winnerId === a ? b : a },
    now,
  );
}
