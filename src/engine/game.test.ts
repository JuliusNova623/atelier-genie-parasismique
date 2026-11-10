import { createDeck } from './deck';
import { endReasons } from './end';
import {
  canUndo,
  createGame,
  currentPlayerId,
  hydrationDue,
  playerScores,
  recordDuel,
  recordTurn,
  remainingCards,
  remainingJokers,
  teamScores,
  undoLast,
} from './game';
import { pointsFor, validateRules } from './scoring';
import { computeStats } from './stats';
import { DEFAULT_RULES, type Game, type Player, type Rules } from './types';

const mk = (id: string, teamId?: string): Player => ({
  id,
  name: id.toUpperCase(),
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

const themes = [
  { id: 't1', cardNumbers: createDeck(20) },
  { id: 't2', cardNumbers: createDeck(20) },
];

function solo(rules: Rules = DEFAULT_RULES): Game {
  return createGame({
    now: 1000,
    mode: 'solo',
    players: [mk('a'), mk('b'), mk('c'), mk('d')],
    rules,
    themes,
  });
}

describe('barème', () => {
  it('applique les points par défaut', () => {
    expect(pointsFor(DEFAULT_RULES, 'done')).toBe(3);
    expect(pointsFor(DEFAULT_RULES, 'refused-drink')).toBe(1);
    expect(pointsFor(DEFAULT_RULES, 'refused-no-drink')).toBe(-2);
    expect(pointsFor(DEFAULT_RULES, 'joker-pass')).toBe(0);
    expect(pointsFor(DEFAULT_RULES, 'done', { doubled: true })).toBe(6);
    expect(pointsFor(DEFAULT_RULES, 'done', { cardPoints: 5 })).toBe(5);
  });

  it('exige boisson bue < carte', () => {
    expect(validateRules(DEFAULT_RULES)).toEqual([]);
    expect(validateRules({ ...DEFAULT_RULES, pointsDrinkDrunk: 3 })).toHaveLength(1);
    expect(
      validateRules({
        ...DEFAULT_RULES,
        jokers: { ...DEFAULT_RULES.jokers, pass: { enabled: true, count: 4 } },
      }),
    ).toHaveLength(1);
  });
});

describe('création de partie', () => {
  it('refuse moins de 2 joueurs et les noms en double', () => {
    expect(() =>
      createGame({ now: 0, mode: 'solo', players: [mk('a')], rules: DEFAULT_RULES, themes }),
    ).toThrow();
    const dup = [mk('a'), { ...mk('b'), name: 'a' }];
    expect(() =>
      createGame({ now: 0, mode: 'solo', players: dup, rules: DEFAULT_RULES, themes }),
    ).toThrow();
  });
});

describe('tours, scores et rotation', () => {
  it('enchaîne fait / refus boisson / refus sans boisson', () => {
    let g = solo();
    expect(currentPlayerId(g)).toBe('a');
    g = recordTurn(g, { themeId: 't1', cardNumber: 5, outcome: 'done' }, 1);
    expect(currentPlayerId(g)).toBe('b');
    g = recordTurn(
      g,
      { themeId: 't1', cardNumber: 6, outcome: 'refused-drink', drinkNumber: 12 },
      2,
    );
    g = recordTurn(
      g,
      { themeId: 't2', cardNumber: 1, outcome: 'refused-no-drink', drinkNumber: 3 },
      3,
    );
    expect(playerScores(g)).toEqual({ a: 3, b: 1, c: -2, d: 0 });
    expect(currentPlayerId(g)).toBe('d');
    g = recordTurn(g, { themeId: 't2', cardNumber: 2, outcome: 'done' }, 4);
    expect(currentPlayerId(g)).toBe('a');
  });

  it('marque la carte comme utilisée et interdit de la rejouer', () => {
    let g = solo();
    g = recordTurn(g, { themeId: 't1', cardNumber: 5, outcome: 'done' }, 1);
    expect(remainingCards(g, 't1')).not.toContain(5);
    expect(remainingCards(g, 't1')).toHaveLength(19);
    expect(() => recordTurn(g, { themeId: 't1', cardNumber: 5, outcome: 'done' }, 2)).toThrow();
  });

  it('exige un numéro de boisson pour un refus, et seulement pour un refus', () => {
    const g = solo();
    expect(() =>
      recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'refused-drink' }, 1),
    ).toThrow();
    expect(() =>
      recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'done', drinkNumber: 2 }, 1),
    ).toThrow();
  });

  it('permet des scores négatifs', () => {
    let g = solo();
    g = recordTurn(
      g,
      { themeId: 't1', cardNumber: 1, outcome: 'refused-no-drink', drinkNumber: 1 },
      1,
    );
    expect(playerScores(g).a).toBe(-2);
  });
});

describe('jokers', () => {
  it('Passe : pas de points, carte consommée, joker consommé', () => {
    let g = solo();
    g = recordTurn(
      g,
      { themeId: 't1', cardNumber: 3, outcome: 'joker-pass', jokerUsed: 'pass' },
      1,
    );
    expect(playerScores(g).a).toBe(0);
    expect(remainingCards(g, 't1')).not.toContain(3);
    expect(remainingJokers(g, 'a').pass).toBe(0);
    expect(remainingJokers(g, 'b').pass).toBe(1);
  });

  it('Double : points ×2 et joker consommé, une seule fois', () => {
    let g = solo();
    g = recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'done', jokerUsed: 'double' }, 1);
    expect(playerScores(g).a).toBe(6);
    g = { ...g, log: g.log.map((e) => ({ ...e, nextPlayerId: 'a' })) };
    expect(() =>
      recordTurn(g, { themeId: 't1', cardNumber: 2, outcome: 'done', jokerUsed: 'double' }, 2),
    ).toThrow('Joker indisponible');
  });

  it('Transfert : le joueur désigné marque, le tour passe au suivant du joueur actif', () => {
    let g = solo();
    g = recordTurn(
      g,
      { themeId: 't1', cardNumber: 1, outcome: 'done', jokerUsed: 'transfer', playerId: 'c' },
      1,
    );
    expect(playerScores(g)).toEqual({ a: 0, b: 0, c: 3, d: 0 });
    expect(currentPlayerId(g)).toBe('b');
    expect(remainingJokers(g, 'a').transfer).toBe(0);
    expect(remainingJokers(g, 'c').transfer).toBe(1);
  });

  it('refuse de faire jouer un autre joueur sans joker Transfert', () => {
    expect(() =>
      recordTurn(solo(), { themeId: 't1', cardNumber: 1, outcome: 'done', playerId: 'c' }, 1),
    ).toThrow();
  });

  it('respecte les jokers désactivés ou à 0', () => {
    const rules: Rules = {
      ...DEFAULT_RULES,
      jokers: {
        pass: { enabled: false, count: 1 },
        double: { enabled: true, count: 0 },
        transfer: { enabled: true, count: 3 },
      },
    };
    const g = solo(rules);
    expect(remainingJokers(g, 'a')).toEqual({ pass: 0, double: 0, transfer: 3 });
  });
});

describe('undo', () => {
  it('restaure scores, cartes, jokers et joueur actif, sur plusieurs niveaux', () => {
    const start = solo();
    let g = start;
    g = recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'done', jokerUsed: 'double' }, 1);
    const afterOne = g;
    g = recordTurn(
      g,
      { themeId: 't2', cardNumber: 2, outcome: 'refused-drink', drinkNumber: 7 },
      2,
    );
    expect(canUndo(g)).toBe(true);

    g = undoLast(g);
    expect(g).toEqual(afterOne);
    expect(currentPlayerId(g)).toBe('b');
    expect(remainingCards(g, 't2')).toHaveLength(20);

    g = undoLast(g);
    expect(g).toEqual(start);
    expect(playerScores(g).a).toBe(0);
    expect(remainingJokers(g, 'a').double).toBe(1);
    expect(currentPlayerId(g)).toBe('a');
    expect(canUndo(g)).toBe(false);
    expect(undoLast(g)).toBe(g);
  });
});

describe('joueur désigné au hasard', () => {
  it('tire un joueur existant à chaque tour', () => {
    let g = solo({ ...DEFAULT_RULES, randomPlayer: true });
    const ids = new Set(g.players.map((p) => p.id));
    for (let n = 1; n <= 10; n++) {
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, n);
      expect(ids.has(currentPlayerId(g))).toBe(true);
    }
  });
});

describe('équipes', () => {
  const teamGame = () =>
    createGame({
      now: 0,
      mode: 'teams',
      players: [mk('a1', 'A'), mk('b1', 'B'), mk('a2', 'A'), mk('b2', 'B'), mk('a3', 'A')],
      teams: [
        { id: 'A', name: 'Rouge', color: '#f00' },
        { id: 'B', name: 'Bleu', color: '#00f' },
      ],
      rules: DEFAULT_RULES,
      themes,
    });

  it('alterne les équipes et fait tourner les membres', () => {
    let g = teamGame();
    const seq: string[] = [currentPlayerId(g)];
    for (let n = 1; n <= 7; n++) {
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, n);
      seq.push(currentPlayerId(g));
    }
    expect(seq).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'b1', 'a1', 'b2']);
  });

  it("somme les points individuels dans le score d'équipe", () => {
    let g = teamGame();
    g = recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'done' }, 1);
    g = recordTurn(
      g,
      { themeId: 't1', cardNumber: 2, outcome: 'refused-no-drink', drinkNumber: 1 },
      2,
    );
    g = recordTurn(g, { themeId: 't1', cardNumber: 3, outcome: 'done' }, 3);
    expect(teamScores(g)).toEqual({ A: 6, B: -2 });
    expect(playerScores(g).a1).toBe(3);
  });

  it('gère une équipe réduite à un seul joueur', () => {
    let g = createGame({
      now: 0,
      mode: 'teams',
      players: [mk('a1', 'A'), mk('b1', 'B'), mk('b2', 'B')],
      teams: [
        { id: 'A', name: 'Rouge', color: '#f00' },
        { id: 'B', name: 'Bleu', color: '#00f' },
      ],
      rules: DEFAULT_RULES,
      themes,
    });
    const seq: string[] = [currentPlayerId(g)];
    for (let n = 1; n <= 4; n++) {
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, n);
      seq.push(currentPlayerId(g));
    }
    expect(seq).toEqual(['a1', 'b1', 'a1', 'b2', 'a1']);
  });

  it('duel : le vainqueur marque, deux équipes différentes obligatoires', () => {
    let g = teamGame();
    g = recordDuel(g, { themeId: 't1', cardNumber: 1, winnerId: 'b1', loserId: 'a1' }, 1);
    expect(playerScores(g).b1).toBe(3);
    expect(g.log[0].outcome).toBe('duel');
    expect(() =>
      recordDuel(g, { themeId: 't1', cardNumber: 2, winnerId: 'a1', loserId: 'a2' }, 2),
    ).toThrow();
  });
});

describe('fin de partie', () => {
  it('détecte score cible, tours, durée et paquets épuisés', () => {
    let g = solo({
      ...DEFAULT_RULES,
      end: { maxRounds: 1, targetScore: 6, durationMinutes: 10 },
    });
    expect(endReasons(g, 1000)).toEqual([]);
    for (let n = 1; n <= 4; n++) {
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, n);
    }
    expect(endReasons(g, 1000)).toEqual(['rounds']);
    g = recordTurn(g, { themeId: 't1', cardNumber: 5, outcome: 'done' }, 5);
    expect(endReasons(g, 1000)).toEqual(['rounds', 'score']);
    expect(endReasons(g, 1000 + 10 * 60_000)).toContain('time');
  });

  it("détecte l'épuisement de tous les thèmes", () => {
    let g = createGame({
      now: 0,
      mode: 'solo',
      players: [mk('a'), mk('b')],
      rules: DEFAULT_RULES,
      themes: [{ id: 'x', cardNumbers: [1, 2] }],
    });
    g = recordTurn(g, { themeId: 'x', cardNumber: 1, outcome: 'done' }, 1);
    expect(endReasons(g, 0)).toEqual([]);
    g = recordTurn(g, { themeId: 'x', cardNumber: 2, outcome: 'done' }, 2);
    expect(endReasons(g, 0)).toEqual(['exhausted']);
  });
});

describe('hydratation', () => {
  it('se déclenche toutes les N cartes', () => {
    let g = solo({ ...DEFAULT_RULES, hydrationEvery: 2 });
    expect(hydrationDue(g)).toBe(false);
    g = recordTurn(g, { themeId: 't1', cardNumber: 1, outcome: 'done' }, 1);
    expect(hydrationDue(g)).toBe(false);
    g = recordTurn(g, { themeId: 't1', cardNumber: 2, outcome: 'done' }, 2);
    expect(hydrationDue(g)).toBe(true);
    expect(hydrationDue(solo({ ...DEFAULT_RULES, hydrationEvery: null }))).toBe(false);
  });
});

describe('stats', () => {
  it('compte faits, refus, boissons, série et récompenses', () => {
    let g = solo();
    const play = (n: number, outcome: 'done' | 'refused-drink' | 'refused-no-drink') =>
      (g = recordTurn(
        g,
        { themeId: 't1', cardNumber: n, outcome, drinkNumber: outcome === 'done' ? undefined : 1 },
        n,
      ));
    // a: done, b: drink, c: nodrink, d: done, a: done, b: drink, c: done, d: done
    play(1, 'done');
    play(2, 'refused-drink');
    play(3, 'refused-no-drink');
    play(4, 'done');
    play(5, 'done');
    play(6, 'refused-drink');
    play(7, 'done');
    play(8, 'done');
    const s = computeStats(g);
    const by = Object.fromEntries(s.players.map((p) => [p.playerId, p]));
    expect(by.a).toMatchObject({ done: 2, refused: 0, bestStreak: 2, score: 6 });
    expect(by.b).toMatchObject({ done: 0, refused: 2, drunk: 2, score: 2 });
    expect(by.c).toMatchObject({ done: 1, noDrink: 1, score: 1 });
    expect(by.d).toMatchObject({ done: 2, bestStreak: 2 });
    expect(s.totals).toEqual({ done: 5, refused: 3, drunk: 2, noDrink: 1 });
    expect(s.biggestDrinker).toBe('b');
    expect(s.biggestQuitter).toBe('b');
    expect(s.bestStreak?.length).toBe(2);
  });

  it('ne désigne personne sur une partie vide', () => {
    const s = computeStats(solo());
    expect(s.bravest).toBeNull();
    expect(s.bestStreak).toBeNull();
  });
});
