export type JokerType = 'pass' | 'double' | 'transfer';

/**
 * Résultat d'un tour.
 * Un transfert de joker n'a pas son propre résultat : le joueur désigné joue la carte et son
 * résultat est enregistré normalement (done / refused-*), avec `jokerUsed: 'transfer'`.
 */
export type Outcome = 'done' | 'refused-drink' | 'refused-no-drink' | 'joker-pass' | 'duel';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  noAlcohol: boolean;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface JokerRule {
  enabled: boolean;
  /** Jokers de départ par joueur (0 à 3). */
  count: number;
}

export interface Rules {
  pointsCard: number;
  pointsDrinkDrunk: number;
  pointsDrinkRefused: number;
  jokers: Record<JokerType, JokerRule>;
  end: {
    /** Chaque joueur a joué N fois. */
    maxRounds: number | null;
    /** Premier joueur / équipe à X points. */
    targetScore: number | null;
    durationMinutes: number | null;
  };
  /** Rappel d'hydratation toutes les N cartes (null = désactivé). */
  hydrationEvery: number | null;
  /** Joueur désigné au hasard à chaque tour au lieu de la rotation. */
  randomPlayer: boolean;
  teamRules: { opponentDecides: boolean; duel: boolean; sharedJokers: boolean };
}

export interface TurnEvent {
  id: string;
  /** Joueur dont c'est le tour. */
  turnOwnerId: string;
  /** Joueur qui joue la carte et marque les points (≠ turnOwnerId en cas de transfert, ou vainqueur d'un duel). */
  playerId: string;
  themeId: string;
  cardNumber: number;
  outcome: Outcome;
  drinkNumber?: number;
  pointsDelta: number;
  jokerUsed?: JokerType;
  /** Duel : adversaire. */
  duelOpponentId?: string;
  /** Joueur désigné pour le tour suivant (rotation ou tirage au hasard). */
  nextPlayerId: string;
  timestamp: number;
}

export type PickerMode = 'dice' | 'shake' | 'cards' | 'slot';

/**
 * Tour en cours, persisté avec la partie. Le résultat est fixé AVANT l'animation :
 * `revealed` passe à true quand l'animation est terminée (si l'app se ferme pendant
 * l'animation, la reprise rejoue la même issue, sans nouveau tirage).
 */
export interface PendingTurn {
  /** theme : roue puis choix du numéro · card : carte tirée · drink : étape boisson après un refus. */
  stage: 'theme' | 'card' | 'drink';
  themeId: string;
  cardNumber?: number;
  /** Étape boisson : boisson tirée (avec remise) ; absente tant que le joueur n'a pas tiré. */
  drinkNumber?: number;
  /** Joker armé pour cette carte (Passe est immédiat et n'est jamais « armé »). */
  joker?: 'double' | 'transfer';
  /** Transfert : joueur désigné qui joue la carte à la place du joueur actif. */
  transferTo?: string;
  revealed: boolean;
}

export interface Game {
  id: string;
  startedAt: number;
  endedAt?: number;
  mode: 'solo' | 'teams';
  players: Player[];
  teams: Team[];
  rules: Rules;
  /** Ordre de passage initial (ids de joueurs). */
  turnOrder: string[];
  firstPlayerId: string;
  /** Numéros de cartes de départ par thème (le paquet restant se déduit du log). */
  themeCards: Record<string, number[]>;
  themeIds: string[];
  log: TurnEvent[];
  pending: PendingTurn | null;
  /** Dernier mode de tirage utilisé par joueur (présélectionné au tour suivant). */
  pickerModes?: Record<string, PickerMode>;
}

export const DEFAULT_RULES: Rules = {
  pointsCard: 3,
  pointsDrinkDrunk: 1,
  pointsDrinkRefused: -2,
  jokers: {
    pass: { enabled: true, count: 1 },
    double: { enabled: true, count: 1 },
    transfer: { enabled: true, count: 1 },
  },
  end: { maxRounds: null, targetScore: null, durationMinutes: null },
  hydrationEvery: 8,
  randomPlayer: false,
  teamRules: { opponentDecides: false, duel: false, sharedJokers: false },
};
