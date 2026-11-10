import { builtInContent } from '../content';
import type { Content } from '../content/schema';
import type { Game } from '../engine/types';
import { db as defaultDb, type AppDb, type DrinkRow } from './db';

const CURRENT = 'current';

export function createRepo(db: AppDb = defaultDb) {
  return {
    async loadCurrentGame(): Promise<Game | undefined> {
      return (await db.currentGame.get(CURRENT))?.game;
    },
    /** Sauvegarde appelée après chaque événement. */
    async saveCurrentGame(game: Game): Promise<void> {
      await db.currentGame.put({ id: CURRENT, game });
    },
    async clearCurrentGame(): Promise<void> {
      await db.currentGame.delete(CURRENT);
    },
    /** Termine la partie : archive dans l'historique et supprime la partie en cours. */
    async archiveGame(game: Game, endedAt: number): Promise<void> {
      await db.transaction('rw', db.gameHistory, db.currentGame, async () => {
        await db.gameHistory.put({ id: game.id, endedAt, game: { ...game, endedAt } });
        await db.currentGame.delete(CURRENT);
      });
    },
    async history(): Promise<Game[]> {
      return (await db.gameHistory.orderBy('endedAt').reverse().toArray()).map((r) => r.game);
    },

    async getContent(): Promise<Content> {
      return (await db.contentOverride.get(CURRENT))?.content ?? builtInContent;
    },
    async setContentOverride(content: Content): Promise<void> {
      await db.contentOverride.put({ id: CURRENT, content });
    },
    async clearContentOverride(): Promise<void> {
      await db.contentOverride.delete(CURRENT);
    },

    async getDrinks(): Promise<DrinkRow[]> {
      const rows = await db.drinks.toArray();
      const byNumber = new Map(rows.map((r) => [r.number, r]));
      return Array.from(
        { length: 20 },
        (_, i) => byNumber.get(i + 1) ?? { number: i + 1, name: '', noAlcohol: false },
      );
    },
    async saveDrinks(drinks: DrinkRow[]): Promise<void> {
      await db.drinks.bulkPut(drinks);
    },

    async getSetting<T>(key: string, fallback: T): Promise<T> {
      const row = await db.settings.get(key);
      return row ? (row.value as T) : fallback;
    },
    async setSetting(key: string, value: unknown): Promise<void> {
      await db.settings.put({ key, value });
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;
export const repo = createRepo();
