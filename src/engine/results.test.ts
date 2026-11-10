import { createDeck } from './deck';
import { createGame, playerScores, recordTurn } from './game';
import { buildResults, endGame, rankScores, replayGame } from './results';
import { DEFAULT_RULES, type Game, type Player } from './types';

const mk = (id: string, teamId?: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

describe('rankScores', () => {
  it('trie par score décroissant', () => {
    const r = rankScores({ a: 1, b: 5, c: 3 }, ['a', 'b', 'c']);
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it('donne le même rang aux ex æquo et saute le suivant (1, 1, 3)', () => {
    const r = rankScores({ a: 4, b: 4, c: 1, d: 0 }, ['a', 'b', 'c', 'd']);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3, 4]);
  });

  it('gère des égalités à trois ou plus (jamais de rang 0)', () => {
    const r = rankScores({ a: 3, b: 0, c: 0, d: 0, e: -1, f: -1 }, ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 2, 2, 5, 5]);
    const allTied = rankScores({ a: 0, b: 0, c: 0, d: 0 }, ['a', 'b', 'c', 'd']);
    expect(allTied.map((x) => x.rank)).toEqual([1, 1, 1, 1]);
    expect(Math.min(...r.map((x) => x.rank))).toBeGreaterThanOrEqual(1);
  });

  it('gère les scores négatifs et un seul joueur', () => {
    expect(rankScores({ a: -2, b: -5 }, ['a', 'b']).map((x) => x.id)).toEqual(['a', 'b']);
    expect(rankScores({ a: 0 }, ['a'])[0].rank).toBe(1);
  });
});

function played(): Game {
  let g = createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a'), mk('b'), mk('c')],
    rules: DEFAULT_RULES,
    themes: [{ id: 't', cardNumbers: createDeck(20) }],
  });
  g = recordTurn(g, { themeId: 't', cardNumber: 1, outcome: 'done' }, 1); // a +3
  g = recordTurn(g, { themeId: 't', cardNumber: 2, outcome: 'done' }, 2); // b +3
  g = recordTurn(g, { themeId: 't', cardNumber: 3, outcome: 'refused-drink', drinkNumber: 4 }, 3); // c +1
  return g;
}

describe('buildResults', () => {
  it('liste les gagnants ex æquo', () => {
    const r = buildResults(played());
    expect(r.winnerIds).toEqual(['a', 'b']);
    expect(r.teams).toBeNull();
    expect(r.players[2]).toMatchObject({ id: 'c', score: 1, rank: 3 });
  });

  it('en mode équipes, le gagnant est une équipe', () => {
    let g = createGame({
      now: 0,
      mode: 'teams',
      players: [mk('a', 'T1'), mk('b', 'T2')],
      teams: [
        { id: 'T1', name: 'Rouges', color: '#f00' },
        { id: 'T2', name: 'Bleus', color: '#00f' },
      ],
      rules: DEFAULT_RULES,
      themes: [{ id: 't', cardNumbers: createDeck(20) }],
    });
    g = recordTurn(g, { themeId: 't', cardNumber: 1, outcome: 'done' }, 1);
    const r = buildResults(g);
    expect(r.winnerIds).toEqual(['T1']);
    expect(r.teams!.map((x) => x.id)).toEqual(['T1', 'T2']);
    expect(r.players[0].id).toBe('a');
  });

  it('une partie vide donne un classement à égalité complète', () => {
    const g = createGame({
      now: 0,
      mode: 'solo',
      players: [mk('a'), mk('b')],
      rules: DEFAULT_RULES,
      themes: [{ id: 't', cardNumbers: createDeck(20) }],
    });
    expect(buildResults(g).winnerIds).toEqual(['a', 'b']);
  });
});

describe('replayGame', () => {
  it('garde joueurs, équipes, règles et ordre, remet scores et cartes à zéro', () => {
    const g = played();
    const again = replayGame(g, 99);
    expect(again.id).not.toBe(g.id);
    expect(again.players).toEqual(g.players);
    expect(again.rules).toEqual(g.rules);
    expect(again.turnOrder).toEqual(g.turnOrder);
    expect(again.log).toEqual([]);
    expect(again.pending).toBeNull();
    expect(again.endedAt).toBeUndefined();
    expect(again.startedAt).toBe(99);
    expect(playerScores(again)).toEqual({ a: 0, b: 0, c: 0 });
    expect(again.themeCards.t).toHaveLength(20);
  });
});

describe('endGame', () => {
  it('renseigne endedAt sans toucher au journal', () => {
    const g = played();
    const done = endGame(g, 500);
    expect(done.endedAt).toBe(500);
    expect(done.log).toEqual(g.log);
  });
});
