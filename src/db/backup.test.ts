import 'fake-indexeddb/auto';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { endGame } from '../engine/results';
import { DEFAULT_RULES, type Game, type Player } from '../engine/types';
import { datedName, parseJson } from '../util/files';
import { BACKUP_VERSION, checkBackup, exportBackup, importBackup } from './backup';
import { AppDb } from './db';
import { createRepo } from './repo';

const mk = (id: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

const newGame = (id?: string): Game => {
  let g = createGame({
    id,
    now: 10,
    mode: 'solo',
    players: [mk('a'), mk('b')],
    rules: DEFAULT_RULES,
    themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
  });
  g = recordTurn(g, { themeId: 'theme-1', cardNumber: 3, outcome: 'done' }, 11);
  return g;
};

let n = 0;
const fresh = () => {
  const db = new AppDb(`backup-${n++}`);
  return { db, repo: createRepo(db) };
};

describe('checkBackup', () => {
  const valid = () => ({
    app: 'roulette-soiree',
    version: BACKUP_VERSION,
    exportedAt: 1,
    history: [endGame(newGame('h1'), 99)],
  });

  it('accepte une sauvegarde valide et la résume', () => {
    const r = checkBackup(valid());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary).toEqual({ games: 1, hasContent: false, hasCurrent: false });
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    for (const bad of [
      null,
      {},
      { app: 'autre', version: 1, exportedAt: 1 },
      { ...valid(), version: 2 },
    ]) {
      const r = checkBackup(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toContain('Sauvegarde invalide');
    }
  });

  it('refuse une partie mal formée avec le chemin du champ', () => {
    const b = valid();
    (b.history[0] as unknown as { players: unknown }).players = 'oups';
    const r = checkBackup(b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain('history.0.players');
  });

  it('valide aussi les cartes importées contenues dans la sauvegarde', () => {
    const bad = structuredClone(builtInContent);
    bad.themes[0].cards.pop();
    const r = checkBackup({ ...valid(), contentOverride: bad });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain('Cartes importées');
  });
});

describe('export / import complet', () => {
  it('restaure à l’identique réglages, boissons, cartes, partie en cours et historique', async () => {
    const a = fresh();
    await a.repo.setSetting('prefs', { visualTheme: 'arcade' });
    await a.repo.saveDrinks([{ number: 4, name: 'Mojito', noAlcohol: false }]);
    await a.repo.setContentOverride({
      ...builtInContent,
      themes: builtInContent.themes.slice(0, 2),
    });
    await a.repo.archiveGame(newGame('old'), 500); // l'archivage supprime la partie en cours…
    await a.repo.saveCurrentGame(newGame('current')); // …donc on la crée après

    const backup = JSON.parse(JSON.stringify(await exportBackup(a.db, 1234)));
    expect(backup.exportedAt).toBe(1234);
    const check = checkBackup(backup);
    expect(check.ok).toBe(true);

    const b = fresh();
    await b.repo.setSetting('prefs', { visualTheme: 'neon' });
    await b.repo.archiveGame(newGame('to-be-erased'), 1);
    if (check.ok) await importBackup(check.backup, b.db);

    expect(await b.repo.getSetting('prefs', null)).toEqual({ visualTheme: 'arcade' });
    expect((await b.repo.getDrinks())[3].name).toBe('Mojito');
    expect((await b.repo.getContent()).themes).toHaveLength(2);
    expect((await b.repo.loadCurrentGame())?.id).toBe('current');
    const ids = (await b.repo.history()).map((g) => g.id);
    expect(ids).toEqual(['old']);
  });

  it('une sauvegarde sans partie en cours vide la partie en cours existante', async () => {
    const a = fresh();
    const backup = await exportBackup(a.db);
    const b = fresh();
    await b.repo.saveCurrentGame(newGame('x'));
    await importBackup(backup, b.db);
    expect(await b.repo.loadCurrentGame()).toBeUndefined();
  });
});

describe('repo : historique', () => {
  it('lit et supprime une partie archivée', async () => {
    const { repo } = fresh();
    await repo.archiveGame(newGame('g1'), 5);
    expect((await repo.getHistoryGame('g1'))?.endedAt).toBe(5);
    await repo.deleteHistoryGame('g1');
    expect(await repo.getHistoryGame('g1')).toBeUndefined();
  });

  it('signale la présence d’un contenu importé', async () => {
    const { repo } = fresh();
    expect(await repo.hasContentOverride()).toBe(false);
    await repo.setContentOverride(builtInContent);
    expect(await repo.hasContentOverride()).toBe(true);
  });
});

describe('util fichiers', () => {
  it('parseJson renvoie une erreur lisible', () => {
    expect(parseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    const bad = parseJson('{oups');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('pas du JSON valide');
  });

  it('datedName produit un nom de fichier daté', () => {
    expect(datedName('cartes', new Date(2026, 10, 9, 8, 5).getTime())).toBe(
      'cartes-20261109-0805.json',
    );
  });
});
