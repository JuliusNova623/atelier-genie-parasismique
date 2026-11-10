import { z } from 'zod';
import { validateContent } from '../content/validate';
import type { Content } from '../content/schema';
import type { Game } from '../engine/types';
import { db as defaultDb, type AppDb, type DrinkRow } from './db';

export const BACKUP_VERSION = 1;

/** Forme minimale d'une partie : suffisante pour refuser un fichier qui n'en est pas une. */
const gameShape = z.looseObject({
  id: z.string(),
  startedAt: z.number(),
  mode: z.enum(['solo', 'teams']),
  players: z.array(z.looseObject({ id: z.string(), name: z.string() })),
  teams: z.array(z.looseObject({ id: z.string() })),
  rules: z.looseObject({}),
  turnOrder: z.array(z.string()),
  firstPlayerId: z.string(),
  themeIds: z.array(z.string()),
  themeCards: z.record(z.string(), z.array(z.number())),
  log: z.array(z.looseObject({ id: z.string() })),
});

const backupShape = z.looseObject({
  app: z.literal('roulette-soiree'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.number(),
  prefs: z.unknown().optional(),
  drinks: z
    .array(z.object({ number: z.number().int(), name: z.string(), noAlcohol: z.boolean() }))
    .optional(),
  contentOverride: z.unknown().optional(),
  currentGame: gameShape.nullable().optional(),
  history: z.array(gameShape).optional(),
});

export interface Backup {
  app: 'roulette-soiree';
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  prefs?: unknown;
  drinks?: DrinkRow[];
  contentOverride?: Content | null;
  currentGame?: Game | null;
  history?: Game[];
}

export type BackupCheck =
  | {
      ok: true;
      backup: Backup;
      summary: { games: number; hasContent: boolean; hasCurrent: boolean };
    }
  | { ok: false; errors: string[] };

/** Valide un fichier de sauvegarde (JSON déjà parsé) avec des messages lisibles. */
export function checkBackup(raw: unknown): BackupCheck {
  const parsed = backupShape.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => {
      const where = i.path.length ? `« ${i.path.join('.')} »` : 'fichier';
      return `Sauvegarde invalide (${where}) : ${i.message}`;
    });
    return { ok: false, errors };
  }
  const data = parsed.data as unknown as Backup;
  if (data.contentOverride) {
    const c = validateContent(data.contentOverride);
    if (!c.ok) return { ok: false, errors: c.errors.map((e) => `Cartes importées : ${e}`) };
    data.contentOverride = c.content;
  }
  return {
    ok: true,
    backup: data,
    summary: {
      games: data.history?.length ?? 0,
      hasContent: !!data.contentOverride,
      hasCurrent: !!data.currentGame,
    },
  };
}

export async function exportBackup(db: AppDb = defaultDb, now = Date.now()): Promise<Backup> {
  const prefs = (await db.settings.get('prefs'))?.value;
  return {
    app: 'roulette-soiree',
    version: BACKUP_VERSION,
    exportedAt: now,
    prefs,
    drinks: await db.drinks.orderBy('number').toArray(),
    contentOverride: (await db.contentOverride.get('current'))?.content ?? null,
    currentGame: (await db.currentGame.get('current'))?.game ?? null,
    history: (await db.gameHistory.orderBy('endedAt').toArray()).map((r) => r.game),
  };
}

/** Remplace TOUTES les données par celles de la sauvegarde (transaction unique). */
export async function importBackup(backup: Backup, db: AppDb = defaultDb): Promise<void> {
  await db.transaction(
    'rw',
    // db.tables : évite une récursion de types (Step.onExpire) dans la signature de Dexie.
    db.tables,
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.drinks.clear(),
        db.contentOverride.clear(),
        db.currentGame.clear(),
        db.gameHistory.clear(),
      ]);
      if (backup.prefs !== undefined) await db.settings.put({ key: 'prefs', value: backup.prefs });
      if (backup.drinks?.length) await db.drinks.bulkPut(backup.drinks);
      if (backup.contentOverride) {
        await db.contentOverride.put({ id: 'current', content: backup.contentOverride });
      }
      if (backup.currentGame) await db.currentGame.put({ id: 'current', game: backup.currentGame });
      for (const g of backup.history ?? []) {
        await db.gameHistory.put({ id: g.id, endedAt: g.endedAt ?? g.startedAt, game: g });
      }
    },
  );
}
