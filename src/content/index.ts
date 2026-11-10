import raw from './content.json';
import { validateContent } from './validate';
import type { Content } from './schema';

const result = validateContent(raw);
if (!result.ok || !result.content) {
  throw new Error(`content.json invalide :\n${result.errors.join('\n')}`);
}

/** Contenu intégré à l'application (validé au chargement). */
export const builtInContent: Content = result.content;
