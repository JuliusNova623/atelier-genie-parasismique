import 'fake-indexeddb/auto';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { DEFAULT_RULES, type Player } from '../engine/types';
import { AppDb } from './db';
import { createRepo } from './repo';

const p = (id: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

let n = 0;
function fresh() {
  const db = new AppDb(`test-${n++}`);
  return { db, repo: createRepo(db) };
}

const newGame = () =>
  createGame({
    now: 1,
    mode: 'solo',
    players: [p('a'), p('b')],
    rules: DEFAULT_RULES,
    themes: [{ id: 't1', cardNumbers: createDeck(20) }],
  });

describe('repo', () => {
  it('sauvegarde et recharge la partie en cours à l’identique', async () => {
    const { repo } = fresh();
    expect(await repo.loadCurrentGame()).toBeUndefined();
    let g = newGame();
    g = recordTurn(g, { themeId: 't1', cardNumber: 4, outcome: 'done' }, 2);
    await repo.saveCurrentGame(g);
    expect(await repo.loadCurrentGame()).toEqual(g);
  });

  it('archive la partie terminée et vide la partie en cours', async () => {
    const { repo } = fresh();
    const g = newGame();
    await repo.saveCurrentGame(g);
    await repo.archiveGame(g, 99);
    expect(await repo.loadCurrentGame()).toBeUndefined();
    const h = await repo.history();
    expect(h).toHaveLength(1);
    expect(h[0].endedAt).toBe(99);
  });

  it('renvoie le contenu intégré, remplaçable puis restaurable', async () => {
    const { repo } = fresh();
    expect(await repo.getContent()).toEqual(builtInContent);
    const custom = { ...builtInContent, themes: builtInContent.themes.slice(0, 2) };
    await repo.setContentOverride(custom);
    expect((await repo.getContent()).themes).toHaveLength(2);
    await repo.clearContentOverride();
    expect(await repo.getContent()).toEqual(builtInContent);
  });

  it('fournit 20 boissons par défaut et conserve les modifications', async () => {
    const { repo } = fresh();
    const d = await repo.getDrinks();
    expect(d).toHaveLength(20);
    expect(d[6]).toEqual({ number: 7, name: '', noAlcohol: false });
    await repo.saveDrinks([{ number: 7, name: 'Mojito', noAlcohol: false }]);
    const d2 = await repo.getDrinks();
    expect(d2[6].name).toBe('Mojito');
    expect(d2).toHaveLength(20);
  });

  it('stocke des réglages avec valeur par défaut', async () => {
    const { repo } = fresh();
    expect(await repo.getSetting('sound', true)).toBe(true);
    await repo.setSetting('sound', false);
    expect(await repo.getSetting('sound', true)).toBe(false);
  });
});
