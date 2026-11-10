import { createDeck } from './deck';
import {
  createGame,
  currentPlayerId,
  playerScores,
  recordTurn,
  remainingJokers,
  teamScores,
  undoLast,
} from './game';
import {
  armJoker,
  cancelDuel,
  completeCard,
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  duelAvailable,
  finishDuel,
  playPass,
  refuseCard,
  resolveDrink,
  revealPending,
  startDuel,
} from './turn';
import { DEFAULT_RULES, type Game, type Player, type Rules } from './types';

const mk = (id: string, teamId: string): Player => ({
  id,
  name: id.toUpperCase(),
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

const teams = [
  { id: 'T1', name: 'Rouges', color: '#f00' },
  { id: 'T2', name: 'Bleus', color: '#00f' },
];

// Ordre de passage : a1 (T1), b1 (T2), a2 (T1), b2 (T2)
const players = [mk('a1', 'T1'), mk('b1', 'T2'), mk('a2', 'T1'), mk('b2', 'T2')];

function teamGame(teamRules: Partial<Rules['teamRules']> = {}, extra: Partial<Rules> = {}): Game {
  return createGame({
    now: 0,
    mode: 'teams',
    players,
    teams,
    rules: {
      ...DEFAULT_RULES,
      ...extra,
      teamRules: { ...DEFAULT_RULES.teamRules, ...teamRules },
    },
    themes: [
      { id: 't1', cardNumbers: createDeck(20) },
      { id: 't2', cardNumbers: createDeck(20) },
    ],
  });
}

const toCard = (g: Game): Game => revealPending(drawCardNumber(revealPending(drawTheme(g))));

describe('Joker partagé', () => {
  it('met les jokers en commun : réserve d’équipe = départ × effectif', () => {
    const g = teamGame({ sharedJokers: true });
    expect(remainingJokers(g, 'a1')).toEqual({ pass: 2, double: 2, transfer: 2 });
    expect(remainingJokers(g, 'a2')).toEqual(remainingJokers(g, 'a1'));
  });

  it('un équipier peut puiser dans la réserve utilisée par un autre', () => {
    let g = toCard(teamGame({ sharedJokers: true }));
    g = playPass(g, 1); // a1 utilise Passe
    expect(remainingJokers(g, 'a1').pass).toBe(1);
    expect(remainingJokers(g, 'a2').pass).toBe(1);
    expect(remainingJokers(g, 'b1').pass).toBe(2); // l'autre équipe n'est pas touchée
  });

  it('épuise la réserve de l’équipe pour tous ses membres', () => {
    let g = teamGame({ sharedJokers: true });
    for (let i = 0; i < 4; i++) {
      // tours de T1 uniquement via a1/a2 : on force le joueur actif
      g = { ...g, log: g.log.map((e) => ({ ...e, nextPlayerId: i % 2 === 0 ? 'a1' : 'a2' })) };
      const owner = i % 2 === 0 ? 'a1' : 'a2';
      void owner;
      if (remainingJokers(g, 'a1').pass === 0) break;
      g = playPass(toCard(g), i);
      g = {
        ...g,
        log: g.log.map((e, k) => (k === g.log.length - 1 ? { ...e, nextPlayerId: 'a2' } : e)),
      };
    }
    expect(remainingJokers(g, 'a1').pass).toBe(0);
    expect(remainingJokers(g, 'a2').pass).toBe(0);
    expect(() => armJoker(toCard({ ...g, pending: null }), 'double')).not.toThrow();
  });

  it('sans la règle, les jokers restent individuels', () => {
    let g = toCard(teamGame());
    g = playPass(g, 1);
    expect(remainingJokers(g, 'a1').pass).toBe(0);
    expect(remainingJokers(g, 'a2').pass).toBe(1);
  });

  it('une équipe réduite à un joueur garde sa réserve individuelle', () => {
    const g = createGame({
      now: 0,
      mode: 'teams',
      players: [mk('a1', 'T1'), mk('b1', 'T2'), mk('b2', 'T2')],
      teams,
      rules: { ...DEFAULT_RULES, teamRules: { ...DEFAULT_RULES.teamRules, sharedJokers: true } },
      themes: [{ id: 't1', cardNumbers: createDeck(20) }],
    });
    expect(remainingJokers(g, 'a1').pass).toBe(1);
    expect(remainingJokers(g, 'b1').pass).toBe(2);
  });
});

describe('L’adversaire décide', () => {
  it('désigne au tirage de la carte un joueur d’une autre équipe, sauvegardé', () => {
    const base = teamGame({ opponentDecides: true });
    for (let i = 0; i < 100; i++) {
      const g = drawCardNumber(revealPending(drawTheme(base)));
      const decider = g.pending!.deciderId!;
      expect(['b1', 'b2']).toContain(decider); // a1 joue : l'adversaire est de T2
      const restored = JSON.parse(JSON.stringify(g)) as Game;
      expect(restored.pending!.deciderId).toBe(decider);
    }
  });

  it('tire l’adversaire de façon uniforme', () => {
    const base = teamGame({ opponentDecides: true });
    let b1 = 0;
    for (let i = 0; i < 2000; i++) {
      if (drawCardNumber(revealPending(drawTheme(base))).pending!.deciderId === 'b1') b1++;
    }
    expect(b1).toBeGreaterThan(850);
    expect(b1).toBeLessThan(1150);
  });

  it('n’agit pas sans la règle ni en mode solo', () => {
    expect(toCard(teamGame()).pending!.deciderId).toBeUndefined();
    const solo = createGame({
      now: 0,
      mode: 'solo',
      players: players.map(({ teamId: _t, ...p }) => (void _t, p)),
      rules: { ...DEFAULT_RULES, teamRules: { ...DEFAULT_RULES.teamRules, opponentDecides: true } },
      themes: [{ id: 't1', cardNumbers: createDeck(20) }],
    });
    expect(toCard(solo).pending!.deciderId).toBeUndefined();
  });

  it('enregistre le décideur dans le journal, pour « faire » comme pour « boire »', () => {
    const done = completeCard(toCard(teamGame({ opponentDecides: true })), 1);
    expect(done.log[0].deciderId).toBeDefined();
    expect(done.log[0].outcome).toBe('done');

    let g = refuseCard(toCard(teamGame({ opponentDecides: true })));
    expect(g.pending!.deciderId).toBeDefined();
    g = resolveDrink(revealPending(drawDrinkNumber(g)), true, 2);
    expect(g.log[0].deciderId).toBeDefined();
    expect(g.log[0].outcome).toBe('refused-drink');
  });

  it('autorise toujours Passe et Transfert', () => {
    const pass = playPass(toCard(teamGame({ opponentDecides: true })), 1);
    expect(pass.log[0].outcome).toBe('joker-pass');
    const tr = completeCard(
      armJoker(toCard(teamGame({ opponentDecides: true })), 'transfer', 'a2'),
      1,
    );
    expect(tr.log[0]).toMatchObject({ playerId: 'a2', jokerUsed: 'transfer' });
  });
});

describe('Duel', () => {
  it('n’est disponible qu’avec la règle, en mode équipes', () => {
    expect(duelAvailable(teamGame())).toBe(false);
    expect(duelAvailable(teamGame({ duel: true }))).toBe(true);
  });

  it('le vainqueur marque les points de carte pour son équipe, sans boisson', () => {
    let g = startDuel(toCard(teamGame({ duel: true })), 'a2', 'b1');
    expect(g.pending!.duel).toEqual({ a: 'a2', b: 'b1' });
    g = finishDuel(g, 'b1', 1);
    expect(playerScores(g)).toEqual({ a1: 0, b1: 3, a2: 0, b2: 0 });
    expect(teamScores(g)).toEqual({ T1: 0, T2: 3 });
    expect(g.log[0]).toMatchObject({
      outcome: 'duel',
      playerId: 'b1',
      duelOpponentId: 'a2',
      turnOwnerId: 'a1',
    });
    expect(g.log[0].drinkNumber).toBeUndefined();
    expect(currentPlayerId(g)).toBe('b1');
    expect(g.pending).toBeNull();
  });

  it('consomme la carte et le tour du joueur actif', () => {
    const g0 = toCard(teamGame({ duel: true }));
    const { cardNumber } = g0.pending!;
    const g = finishDuel(startDuel(g0, 'a1', 'b2'), 'a1', 1);
    expect(g.log).toHaveLength(1);
    expect(g.log[0].cardNumber).toBe(cardNumber);
  });

  it('exige deux équipes différentes', () => {
    const g = toCard(teamGame({ duel: true }));
    expect(() => startDuel(g, 'a1', 'a2')).toThrow('équipes différentes');
    expect(() => startDuel(g, 'a1', 'zz')).toThrow();
  });

  it('interdit refus, jokers et validation simple pendant le duel', () => {
    const g = startDuel(toCard(teamGame({ duel: true })), 'a1', 'b1');
    expect(() => refuseCard(g)).toThrow();
    expect(() => playPass(g, 1)).toThrow();
    expect(() => armJoker(g, 'double')).toThrow();
    expect(() => completeCard(g, 1)).toThrow();
    expect(() => finishDuel(g, 'a2', 1)).toThrow('duelliste');
  });

  it('refuse un duel si un joker est armé, et peut être annulé', () => {
    const armed = armJoker(toCard(teamGame({ duel: true })), 'double');
    expect(() => startDuel(armed, 'a1', 'b1')).toThrow('joker');
    const g = cancelDuel(startDuel(toCard(teamGame({ duel: true })), 'a1', 'b1'));
    expect(g.pending!.duel).toBeUndefined();
    expect(completeCard(g, 1).log[0].outcome).toBe('done');
  });

  it('n’est possible qu’une fois par tour de table (4 joueurs = 4 tours)', () => {
    let g = teamGame({ duel: true });
    g = finishDuel(startDuel(toCard(g), 'a1', 'b1'), 'a1', 1); // tour 1 : duel
    expect(duelAvailable(g)).toBe(false); // même tour de table
    g = completeCard(toCard(g), 2);
    g = completeCard(toCard(g), 3);
    expect(duelAvailable(g)).toBe(false);
    g = completeCard(toCard(g), 4); // fin du tour de table (4 tours joués)
    expect(g.log).toHaveLength(4);
    expect(duelAvailable(g)).toBe(true); // nouveau tour de table
    expect(() => startDuel(toCard(teamGame({ duel: true })), 'a1', 'b1')).not.toThrow();
  });

  it('un second duel dans le même tour de table est refusé', () => {
    let g = teamGame({ duel: true });
    g = finishDuel(startDuel(toCard(g), 'a1', 'b1'), 'a1', 1);
    expect(() => startDuel(toCard(g), 'b1', 'a2')).toThrow('indisponible');
  });

  it('l’annulation du tour remet le duel à disposition et rend les points', () => {
    const start = teamGame({ duel: true });
    let g = finishDuel(startDuel(toCard(start), 'a1', 'b1'), 'b1', 1);
    expect(duelAvailable(g)).toBe(false);
    g = undoLast(g);
    expect(duelAvailable(g)).toBe(true);
    expect(playerScores(g).b1).toBe(0);
  });

  it('les duels comptent dans le journal comme des tours à part entière', () => {
    let g = teamGame({ duel: true });
    g = recordTurn(
      toCard(g),
      {
        themeId: toCard(g).pending!.themeId,
        cardNumber: toCard(g).pending!.cardNumber!,
        outcome: 'done',
      },
      1,
    );
    expect(g.log).toHaveLength(1);
  });
});
