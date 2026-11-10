import { z } from 'zod';

export const cardSchema = z.object({
  number: z.number().int().min(1),
  type: z.enum(['question', 'action']),
  text: z.string().min(1),
  points: z.number().nullable().optional(),
  timer: z.number().int().positive().nullable().optional(),
});

export const themeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
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
