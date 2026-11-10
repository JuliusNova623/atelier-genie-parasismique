import { createDeck } from './deck';
import {
  createGame,
  currentPlayerId,
  hydrationDue,
  playerScores,
  recordTurn,
  remainingCards,
  remainingJokers,
  undoLast,
} from './game';
import {
  armJoker,
  cardPlayerId,
  completeCard,
  disarmJoker,
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  playPass,
  refuseCard,
  resolveDrink,
  revealPending,
} from './turn';
import { DEFAULT_RULES, type Game, type Player, type Rules } from './types';

const mk = (id: string): Player => ({
  id,
  name: id.toUpperCase(),
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

const newGame = (rules: Rules = DEFAULT_RULES): Game =>
  createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a'), mk('b'), mk('c')],
    rules,
    themes: [
      { id: 't1', cardNumbers: createDeck(20) },
      { id: 't2', cardNumbers: createDeck(20) },
    ],
  });

/** Roue + tirage de carte, jusqu'à la carte révélée. */
const toCard = (g: Game): Game => revealPending(drawCardNumber(revealPending(drawTheme(g))));
const toDrink = (g: Game): Game => revealPending(drawDrinkNumber(refuseCard(toCard(g))));

describe('carte réalisée', () => {
  it('donne les points de carte, consomme la carte et passe au joueur suivant', () => {
    let g = toCard(newGame());
    const { themeId, cardNumber } = g.pending!;
    g = completeCard(g, 1);
    expect(playerScores(g)).toEqual({ a: 3, b: 0, c: 0 });
    expect(remainingCards(g, themeId)).not.toContain(cardNumber);
    expect(currentPlayerId(g)).toBe('b');
    expect(g.pending).toBeNull();
    expect(g.log[0].outcome).toBe('done');
  });

  it('ignore un second clic (double tap) : la carte n’est comptée qu’une fois', () => {
    const g = completeCard(toCard(newGame()), 1);
    expect(() => completeCard(g, 2)).toThrow();
    expect(g.log).toHaveLength(1);
  });
});

describe('refus et boisson', () => {
  it('« J’ai bu » : points boisson, boisson enregistrée, carte consommée', () => {
    let g = toDrink(newGame());
    const { themeId, cardNumber, drinkNumber } = g.pending!;
    expect(drinkNumber).toBeGreaterThanOrEqual(1);
    expect(drinkNumber).toBeLessThanOrEqual(20);
    g = resolveDrink(g, true, 1);
    expect(playerScores(g).a).toBe(1);
    expect(g.log[0]).toMatchObject({ outcome: 'refused-drink', drinkNumber, cardNumber });
    expect(remainingCards(g, themeId)).not.toContain(cardNumber);
    expect(currentPlayerId(g)).toBe('b');
  });

  it('« Je ne bois pas » : points négatifs', () => {
    const g = resolveDrink(toDrink(newGame()), false, 1);
    expect(playerScores(g).a).toBe(-2);
    expect(g.log[0].outcome).toBe('refused-no-drink');
  });

  it('refuser ne consomme pas encore la carte avant la fin du tour, mais la boisson est exigée', () => {
    const g = refuseCard(toCard(newGame()));
    expect(g.pending?.stage).toBe('drink');
    expect(g.log).toHaveLength(0);
    expect(() => resolveDrink(g, true, 1)).toThrow();
    expect(() => completeCard(g, 1)).toThrow();
  });

  it('tire la boisson avec remise : la même boisson peut retomber, uniformément sur 1..20', () => {
    const counts = new Array(21).fill(0);
    const base = refuseCard(toCard(newGame()));
    for (let i = 0; i < 20_000; i++) counts[drawDrinkNumber(base).pending!.drinkNumber!]++;
    expect(counts[0]).toBe(0);
    const chi = counts.slice(1).reduce((s, c) => s + (c - 1000) ** 2 / 1000, 0);
    expect(chi).toBeLessThan(55);
    expect(Math.min(...counts.slice(1))).toBeGreaterThan(0);
  });

  it('interdit de tirer deux fois la boisson dans le même tour', () => {
    const g = drawDrinkNumber(refuseCard(toCard(newGame())));
    expect(() => drawDrinkNumber(g)).toThrow();
  });

  it('survit à un rechargement JSON en plein tirage de boisson', () => {
    const g = drawDrinkNumber(refuseCard(toCard(newGame())));
    const restored = JSON.parse(JSON.stringify(g)) as Game;
    expect(restored.pending).toEqual(g.pending);
  });
});

describe('jokers', () => {
  it('Passe : ni points ni boisson, carte et joker consommés', () => {
    let g = toCard(newGame());
    const { themeId, cardNumber } = g.pending!;
    g = playPass(g, 1);
    expect(playerScores(g).a).toBe(0);
    expect(g.log[0]).toMatchObject({ outcome: 'joker-pass', jokerUsed: 'pass' });
    expect(remainingCards(g, themeId)).not.toContain(cardNumber);
    expect(remainingJokers(g, 'a').pass).toBe(0);
    expect(currentPlayerId(g)).toBe('b');
  });

  it('Double : points ×2 si la carte est réalisée, joker consommé', () => {
    let g = armJoker(toCard(newGame()), 'double');
    g = completeCard(g, 1);
    expect(playerScores(g).a).toBe(6);
    expect(remainingJokers(g, 'a').double).toBe(0);
  });

  it('Double : sans effet et non consommé si le joueur refuse', () => {
    let g = armJoker(toCard(newGame()), 'double');
    g = resolveDrink(revealPending(drawDrinkNumber(refuseCard(g))), true, 1);
    expect(playerScores(g).a).toBe(1);
    expect(remainingJokers(g, 'a').double).toBe(1);
  });

  it('Double peut être désarmé sans rien consommer', () => {
    let g = armJoker(toCard(newGame()), 'double');
    g = disarmJoker(g);
    g = completeCard(g, 1);
    expect(playerScores(g).a).toBe(3);
    expect(remainingJokers(g, 'a').double).toBe(1);
  });

  it('Transfert : le joueur désigné joue la carte et marque ; le tour passe au suivant du joueur actif', () => {
    let g = armJoker(toCard(newGame()), 'transfer', 'c');
    expect(cardPlayerId(g)).toBe('c');
    g = completeCard(g, 1);
    expect(playerScores(g)).toEqual({ a: 0, b: 0, c: 3 });
    expect(g.log[0]).toMatchObject({ turnOwnerId: 'a', playerId: 'c', jokerUsed: 'transfer' });
    expect(remainingJokers(g, 'a').transfer).toBe(0);
    expect(remainingJokers(g, 'c').transfer).toBe(1);
    expect(currentPlayerId(g)).toBe('b');
  });

  it('Transfert : le refus et la boisson concernent le joueur désigné', () => {
    let g = armJoker(toCard(newGame()), 'transfer', 'b');
    g = refuseCard(g);
    expect(g.pending).toMatchObject({ stage: 'drink', transferTo: 'b', joker: 'transfer' });
    g = resolveDrink(revealPending(drawDrinkNumber(g)), false, 1);
    expect(playerScores(g)).toEqual({ a: 0, b: -2, c: 0 });
    expect(remainingJokers(g, 'a').transfer).toBe(0);
  });

  it('refuse un joker indisponible, double, ou un transfert vers soi-même', () => {
    const none: Rules = {
      ...DEFAULT_RULES,
      jokers: { ...DEFAULT_RULES.jokers, double: { enabled: true, count: 0 } },
    };
    expect(() => armJoker(toCard(newGame(none)), 'double')).toThrow('indisponible');
    const g = armJoker(toCard(newGame()), 'double');
    expect(() => armJoker(g, 'transfer', 'b')).toThrow('déjà armé');
    expect(() => armJoker(toCard(newGame()), 'transfer', 'a')).toThrow();
    expect(() => armJoker(toCard(newGame()), 'transfer')).toThrow();
    expect(() => armJoker(toCard(newGame()), 'transfer', 'zz')).toThrow();
  });

  it('Passe est impossible avec un joker armé, et un joker déjà utilisé ne revient pas', () => {
    expect(() => playPass(armJoker(toCard(newGame()), 'double'), 1)).toThrow();
    let g = playPass(toCard(newGame()), 1);
    g = { ...g, log: g.log.map((e) => ({ ...e, nextPlayerId: 'a' })) };
    expect(() => playPass(toCard(g), 2)).toThrow();
  });

  it('un transfert doit désigner un autre joueur côté journal', () => {
    const g = toCard(newGame());
    expect(() =>
      recordTurn(
        g,
        { themeId: 't1', cardNumber: 1, outcome: 'done', jokerUsed: 'transfer', playerId: 'a' },
        1,
      ),
    ).toThrow();
  });
});

describe('annulation', () => {
  it('annule un tour terminé avec refus + boisson et restaure tout', () => {
    const start = newGame();
    const g = resolveDrink(toDrink(start), false, 1);
    const back = undoLast(g);
    expect(back).toEqual({ ...start, pending: null });
    expect(playerScores(back).a).toBe(0);
    expect(currentPlayerId(back)).toBe('a');
  });

  it('rend le joker utilisé en annulant le tour', () => {
    const g = playPass(toCard(newGame()), 1);
    expect(remainingJokers(g, 'a').pass).toBe(0);
    expect(remainingJokers(undoLast(g), 'a').pass).toBe(1);
  });
});

describe('rappel d’hydratation', () => {
  it('apparaît après N cartes jouées, quel que soit le résultat', () => {
    let g = newGame({ ...DEFAULT_RULES, hydrationEvery: 2 });
    g = completeCard(toCard(g), 1);
    expect(hydrationDue(g)).toBe(false);
    g = resolveDrink(toDrink(g), true, 2);
    expect(hydrationDue(g)).toBe(true);
  });
});
