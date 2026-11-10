import type { EffectRecord } from './effects';
import { newId } from './id';
import { pickOne, type Uint32Source } from './rng';
import { pointsFor } from './scoring';
import type { Game, JokerType, Outcome, Player, Rules, TurnEvent } from './types';

const JOKER_TYPES: JokerType[] = ['pass', 'double', 'transfer'];

export interface NewGameInput {
  id?: string;
  now: number;
  mode: 'solo' | 'teams';
  players: Player[];
  teams?: Game['teams'];
  rules: Rules;
  /** Thèmes : id → numéros de cartes. */
  themes: { id: string; cardNumbers: number[] }[];
  /** Ordre de passage (déjà mélangé par l'appelant si besoin). Défaut : ordre de saisie. */
  turnOrder?: string[];
}

export function createGame(input: NewGameInput): Game {
  const { players } = input;
  if (players.length < 2 || players.length > 20) throw new RangeError('Il faut de 2 à 20 joueurs.');
  const names = new Set(players.map((p) => p.name.trim().toLowerCase()));
  if (names.size !== players.length) throw new Error('Les noms de joueurs doivent être uniques.');
  const turnOrder = input.turnOrder ?? players.map((p) => p.id);
  return {
    id: input.id ?? newId(),
    startedAt: input.now,
    mode: input.mode,
    players,
    teams: input.teams ?? [],
    rules: input.rules,
    turnOrder,
    firstPlayerId: turnOrder[0],
    themeIds: input.themes.map((t) => t.id),
    themeCards: Object.fromEntries(input.themes.map((t) => [t.id, [...t.cardNumbers]])),
    log: [],
    pending: null,
  };
}

/** Cartes encore disponibles dans un thème. */
export function remainingCards(game: Game, themeId: string): number[] {
  const played = new Set(game.log.filter((e) => e.themeId === themeId).map((e) => e.cardNumber));
  return (game.themeCards[themeId] ?? []).filter((n) => !played.has(n));
}

export function exhaustedThemes(game: Game): string[] {
  return game.themeIds.filter((id) => remainingCards(game, id).length === 0);
}

export function isAllExhausted(game: Game): boolean {
  return game.themeIds.every((id) => remainingCards(game, id).length === 0);
}

export function currentPlayerId(game: Game): string {
  return game.log.length ? game.log[game.log.length - 1].nextPlayerId : game.firstPlayerId;
}

export function getPlayer(game: Game, id: string): Player {
  const p = game.players.find((x) => x.id === id);
  if (!p) throw new Error(`Joueur inconnu : ${id}`);
  return p;
}

/**
 * Jokers restants d'un joueur (déduits du log). Avec la règle « Joker partagé » (mode équipes),
 * les jokers de départ de tous les membres sont mis en commun : la réserve de l'équipe vaut
 * « nombre de départ × effectif » et n'importe quel équipier peut y puiser.
 */
export function remainingJokers(game: Game, playerId: string): Record<JokerType, number> {
  const me = game.players.find((p) => p.id === playerId);
  const shared = game.mode === 'teams' && game.rules.teamRules.sharedJokers && !!me?.teamId;
  const members = shared ? game.players.filter((p) => p.teamId === me?.teamId) : [];
  const ids = new Set(shared ? members.map((p) => p.id) : [playerId]);
  const out = {} as Record<JokerType, number>;
  for (const t of JOKER_TYPES) {
    const rule = game.rules.jokers[t];
    const pool = rule.count * (shared ? members.length : 1);
    const used = game.log.filter((e) => ids.has(e.turnOwnerId) && e.jokerUsed === t).length;
    out[t] = rule.enabled ? Math.max(0, pool - used) : 0;
  }
  return out;
}

/** Joueur suivant : tirage au hasard, alternance d'équipes, ou rotation simple. */
export function nextPlayerId(game: Game, ownerId: string, source?: Uint32Source): string {
  if (game.rules.randomPlayer) return pickOne(game.players, source).id;
  const order = game.turnOrder;
  if (game.mode === 'teams' && game.teams.length > 1) {
    const teamOrder = [
      ...new Set(order.map((id) => getPlayer(game, id).teamId).filter((t): t is string => !!t)),
    ];
    const ownerTeam = getPlayer(game, ownerId).teamId;
    const nextTeam = teamOrder[(teamOrder.indexOf(ownerTeam ?? '') + 1) % teamOrder.length];
    const members = order.filter((id) => getPlayer(game, id).teamId === nextTeam);
    const lastForTeam = [...game.log]
      .reverse()
      .find((e) => getPlayer(game, e.turnOwnerId).teamId === nextTeam)?.turnOwnerId;
    if (!lastForTeam) return members[0];
    return members[(members.indexOf(lastForTeam) + 1) % members.length];
  }
  return order[(order.indexOf(ownerId) + 1) % order.length];
}

export interface TurnInput {
  themeId: string;
  cardNumber: number;
  outcome: Exclude<Outcome, 'duel'>;
  /** Joueur qui joue la carte (transfert). Défaut : le joueur actif. */
  playerId?: string;
  drinkNumber?: number;
  jokerUsed?: JokerType;
  cardPoints?: number | null;
  deciderId?: string;
  /** Effets de la carte (malus infligés, règles créées…). */
  effects?: EffectRecord[];
}

/** Effets décidés entre deux tours (fautes…) + effets de la carte : tous joints au tour enregistré. */
function withEffects(game: Game, own: EffectRecord[] = []): { effects?: EffectRecord[] } {
  const all = [...(game.carry ?? []), ...own];
  return all.length ? { effects: all } : {};
}

/** Ajoute un tour au journal. Pur : renvoie une nouvelle partie. */
export function recordTurn(game: Game, input: TurnInput, now: number, source?: Uint32Source): Game {
  const owner = currentPlayerId(game);
  if (!remainingCards(game, input.themeId).includes(input.cardNumber)) {
    throw new Error(`Carte ${input.cardNumber} du thème ${input.themeId} déjà jouée ou inconnue.`);
  }
  const refused = input.outcome === 'refused-drink' || input.outcome === 'refused-no-drink';
  if (refused && input.drinkNumber === undefined) throw new Error('Numéro de boisson requis.');
  if (!refused && input.drinkNumber !== undefined) {
    throw new Error('Pas de boisson pour ce résultat.');
  }
  if (input.jokerUsed) {
    if (remainingJokers(game, owner)[input.jokerUsed] < 1) throw new Error('Joker indisponible.');
    if (input.jokerUsed === 'pass' && input.outcome !== 'joker-pass') {
      throw new Error('Le joker Passe produit le résultat « joker-pass ».');
    }
    if (input.jokerUsed === 'double' && input.outcome !== 'done') {
      throw new Error('Le joker Double ne s’applique qu’à une carte réalisée.');
    }
  }
  if (input.outcome === 'joker-pass' && input.jokerUsed !== 'pass') {
    throw new Error('« joker-pass » exige le joker Passe.');
  }
  const playerId = input.playerId ?? owner;
  if (input.jokerUsed !== 'transfer' && playerId !== owner) {
    throw new Error('Seul un joker Transfert permet de faire jouer un autre joueur.');
  }
  if (input.jokerUsed === 'transfer' && playerId === owner) {
    throw new Error('Le transfert doit désigner un autre joueur.');
  }
  const event: TurnEvent = {
    id: newId(),
    turnOwnerId: owner,
    playerId,
    themeId: input.themeId,
    cardNumber: input.cardNumber,
    outcome: input.outcome,
    drinkNumber: input.drinkNumber,
    jokerUsed: input.jokerUsed,
    deciderId: input.deciderId,
    pointsDelta: pointsFor(game.rules, input.outcome, {
      doubled: input.jokerUsed === 'double',
      cardPoints: input.cardPoints,
    }),
    nextPlayerId: nextPlayerId(game, owner, source),
    ...withEffects(game, input.effects),
    timestamp: now,
  };
  return { ...game, log: [...game.log, event], pending: null, carry: undefined };
}

/** Duel : le vainqueur marque les points de carte, aucune boisson. */
export function recordDuel(
  game: Game,
  input: {
    themeId: string;
    cardNumber: number;
    winnerId: string;
    loserId: string;
    cardPoints?: number | null;
  },
  now: number,
  source?: Uint32Source,
): Game {
  const owner = currentPlayerId(game);
  if (!remainingCards(game, input.themeId).includes(input.cardNumber)) {
    throw new Error('Carte déjà jouée ou inconnue.');
  }
  const wTeam = getPlayer(game, input.winnerId).teamId;
  const lTeam = getPlayer(game, input.loserId).teamId;
  if (!wTeam || wTeam === lTeam) throw new Error('Un duel oppose deux équipes différentes.');
  const event: TurnEvent = {
    id: newId(),
    turnOwnerId: owner,
    playerId: input.winnerId,
    duelOpponentId: input.loserId,
    themeId: input.themeId,
    cardNumber: input.cardNumber,
    outcome: 'duel',
    pointsDelta: pointsFor(game.rules, 'duel', { cardPoints: input.cardPoints }),
    nextPlayerId: nextPlayerId(game, owner, source),
    ...withEffects(game),
    timestamp: now,
  };
  return { ...game, log: [...game.log, event], pending: null, carry: undefined };
}

export function canUndo(game: Game): boolean {
  return game.log.length > 0;
}

/** Annule le dernier tour (plusieurs niveaux possibles) : tout se déduit du log. */
export function undoLast(game: Game): Game {
  if (!canUndo(game)) return game;
  return { ...game, log: game.log.slice(0, -1), pending: null };
}

export function playerScores(game: Game): Record<string, number> {
  const s = Object.fromEntries(game.players.map((p) => [p.id, 0]));
  for (const e of game.log) s[e.playerId] += e.pointsDelta;
  return s;
}

export function teamScores(game: Game): Record<string, number> {
  const s = Object.fromEntries(game.teams.map((t) => [t.id, 0]));
  const byPlayer = playerScores(game);
  for (const p of game.players) if (p.teamId) s[p.teamId] += byPlayer[p.id];
  return s;
}

/** Nombre de tours joués (comme joueur dont c'était le tour). */
export function turnsPlayed(game: Game): Record<string, number> {
  const t = Object.fromEntries(game.players.map((p) => [p.id, 0]));
  for (const e of game.log) t[e.turnOwnerId]++;
  return t;
}

/** Faut-il afficher le rappel d'hydratation après ce nombre de cartes ? */
export function hydrationDue(game: Game): boolean {
  const n = game.rules.hydrationEvery;
  return !!n && game.log.length > 0 && game.log.length % n === 0;
}
