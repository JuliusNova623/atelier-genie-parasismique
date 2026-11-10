import { builtInContent } from '../content';

/** Utilitaires de test : retrouver des cartes du contenu intégré sans en dépendre en dur. */
export const themeName = (id: string): string =>
  builtInContent.themes.find((t) => t.id === id)?.name ?? id;

export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Found {
  themeId: string;
  number: number;
  text: string;
}

function find(pred: (type: string, timer: number | null | undefined) => boolean): Found {
  for (const t of builtInContent.themes) {
    for (const c of t.cards) {
      if (pred(c.type, c.timer)) return { themeId: t.id, number: c.number, text: c.text };
    }
  }
  throw new Error('Aucune carte correspondante dans le contenu intégré.');
}

/** Première question (type « question ») du contenu. */
export const QUESTION = find((type) => type === 'question');
/** Première action avec chronomètre. */
export const TIMED_ACTION = find((type, timer) => type === 'action' && !!timer);
