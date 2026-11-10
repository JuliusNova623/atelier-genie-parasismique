import Dexie, { type EntityTable } from 'dexie';
import type { Content } from '../content/schema';
import type { Game } from '../engine/types';

export interface SettingRow {
  key: string;
  value: unknown;
}
export interface DrinkRow {
  number: number;
  name: string;
  noAlcohol: boolean;
}

export class AppDb extends Dexie {
  settings!: EntityTable<SettingRow, 'key'>;
  drinks!: EntityTable<DrinkRow, 'number'>;
  contentOverride!: EntityTable<{ id: string; content: Content }, 'id'>;
  currentGame!: EntityTable<{ id: string; game: Game }, 'id'>;
  gameHistory!: EntityTable<{ id: string; endedAt: number; game: Game }, 'id'>;

  constructor(name = 'roulette-soiree') {
    super(name);
    this.version(1).stores({
      settings: 'key',
      drinks: 'number',
      contentOverride: 'id',
      currentGame: 'id',
      gameHistory: 'id, endedAt',
    });
  }
}

export const db = new AppDb();
