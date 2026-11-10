import { z } from 'zod';
import type { Step } from '../engine/steps';

const whenSchema = z.object({
  var: z.string().min(1),
  is: z.array(z.union([z.string(), z.number()])).optional(),
  gt: z.number().optional(),
  lte: z.number().optional(),
  empty: z.boolean().optional(),
});

const multSchema = z.union([z.number().positive(), z.literal('max')]);
const refSchema = z.string().min(1);
const refsSchema = z.union([refSchema, z.array(refSchema).min(1)]);

const faultSchema = z.object({
  mult: multSchema.optional(),
  ends: z.boolean().optional(),
  count: z.union([z.literal(1), z.literal('any')]).optional(),
});

/** Étapes d'effet d'une carte (voir `src/engine/steps.ts`). */
export const stepSchema: z.ZodType<Step> = z.lazy(() =>
  z.discriminatedUnion('do', [
    z.object({
      do: z.literal('pick'),
      when: whenSchema.optional(),
      as: refSchema,
      prompt: z.string().min(1),
      from: z.enum(['others', 'all']).optional(),
      among: z.array(refSchema).optional(),
      count: z.union([z.literal(1), z.literal(2), z.literal('any')]).optional(),
    }),
    z.object({
      do: z.literal('ask'),
      when: whenSchema.optional(),
      as: refSchema,
      prompt: z.string().min(1),
      options: z.array(z.object({ id: refSchema, label: z.string().min(1) })).min(2),
    }),
    z.object({
      do: z.literal('number'),
      when: whenSchema.optional(),
      as: refSchema,
      prompt: z.string().min(1),
      min: z.number().int(),
      max: z.number().int(),
    }),
    z.object({
      do: z.literal('draw'),
      when: whenSchema.optional(),
      as: refSchema,
      prompt: z.string().optional(),
    }),
    z.object({
      do: z.literal('malus'),
      when: whenSchema.optional(),
      to: refsSchema,
      mult: multSchema.optional(),
      draw: refSchema.optional(),
      prompt: z.string().optional(),
    }),
    z.object({
      do: z.literal('distribute'),
      when: whenSchema.optional(),
      portions: z.number().int().positive(),
      draw: refSchema.optional(),
      by: refSchema.optional(),
      prompt: z.string().optional(),
    }),
    z.object({
      do: z.literal('water'),
      when: whenSchema.optional(),
      to: refSchema,
      prompt: z.string().optional(),
    }),
    z.object({
      do: z.literal('rule'),
      when: whenSchema.optional(),
      text: z.string().min(1),
      subject: z.union([refSchema, z.array(refSchema).min(1)]).optional(),
      turns: z.union([z.number().int().positive(), z.literal('round')]).optional(),
      until: z.enum(['next-turn', 'owner-turn', 'end']).optional(),
      fault: faultSchema.optional(),
      link: z.tuple([refSchema, refSchema]).optional(),
      onExpire: z.array(stepSchema).optional(),
    }),
    z.object({ do: z.literal('shield'), when: whenSchema.optional(), protector: refSchema }),
    z.object({
      do: z.literal('cancel-rule'),
      when: whenSchema.optional(),
      prompt: z.string().optional(),
    }),
    z.object({ do: z.literal('clear-rules'), when: whenSchema.optional() }),
    z.object({ do: z.literal('rotate-rules'), when: whenSchema.optional() }),
    z.object({
      do: z.literal('end-rule'),
      when: whenSchema.optional(),
      id: refSchema,
      why: z.enum(['cancel', 'resolved', 'fault', 'clear']),
    }),
    z.object({ do: z.literal('info'), when: whenSchema.optional(), text: z.string().min(1) }),
  ]),
) as unknown as z.ZodType<Step>;

export const cardSchema = z.object({
  number: z.number().int().min(1),
  type: z.enum(['question', 'action']),
  text: z.string().min(1),
  /** Réponse cachée (énigmes, casse-têtes) : affichée sur demande avec « Voir la réponse ». */
  answer: z.string().min(1).optional(),
  /** Effet de la carte : choisir un joueur, malus, règle durable… (étapes). */
  flow: z.array(stepSchema).optional(),
  points: z.number().nullable().optional(),
  timer: z.number().int().positive().nullable().optional(),
});

export const themeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Libellé court affiché sur la roue (facultatif ; sinon le nom en capitales). */
  short: z.string().min(1).optional(),
  emoji: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur au format #rrggbb'),
  description: z.string().optional(),
  cards: z.array(cardSchema),
});

export const contentSchema = z.object({
  version: z.literal(1),
  themes: z.array(themeSchema).min(1),
});

export type Card = z.infer<typeof cardSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Content = z.infer<typeof contentSchema>;

export const EXPECTED_THEMES = 10;
export const CARDS_PER_THEME = 20;
