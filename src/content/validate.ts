import { CARDS_PER_THEME, EXPECTED_THEMES, contentSchema, type Content } from './schema';

export interface ValidationResult {
  ok: boolean;
  content?: Content;
  errors: string[];
  warnings: string[];
}

function formatPath(path: PropertyKey[], raw: unknown): string {
  const [root, ti, key, ci, field] = path;
  if (root === 'themes' && typeof ti === 'number') {
    const themes = (raw as { themes?: { name?: string; cards?: { number?: number }[] }[] })?.themes;
    const theme = themes?.[ti];
    const where = `Thème n°${ti + 1}${theme?.name ? ` (« ${theme.name} »)` : ''}`;
    if (key === 'cards' && typeof ci === 'number') {
      const num = theme?.cards?.[ci]?.number;
      return `${where}, carte ${num ?? `à la position ${ci + 1}`}${field ? `, champ « ${String(field)} »` : ''}`;
    }
    return `${where}${key ? `, champ « ${String(key)} »` : ''}`;
  }
  return path.length ? `Champ « ${path.map(String).join('.')} »` : 'Fichier';
}

/** Valide un contenu (JSON déjà parsé) avec des messages lisibles en français. */
export function validateContent(raw: unknown): ValidationResult {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${formatPath(i.path, raw)} : ${i.message}`),
      warnings: [],
    };
  }
  const content = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (content.themes.length !== EXPECTED_THEMES) {
    warnings.push(`${content.themes.length} thèmes trouvés (${EXPECTED_THEMES} attendus).`);
  }
  const ids = new Set<string>();
  content.themes.forEach((t, ti) => {
    const label = `Thème n°${ti + 1} (« ${t.name} »)`;
    if (ids.has(t.id)) errors.push(`${label} : identifiant « ${t.id} » en double.`);
    ids.add(t.id);
    if (t.cards.length !== CARDS_PER_THEME) {
      errors.push(`${label} : ${t.cards.length} cartes (${CARDS_PER_THEME} attendues).`);
    }
    const seen = new Set<number>();
    for (const c of t.cards) {
      if (c.number > CARDS_PER_THEME) {
        errors.push(`${label}, carte ${c.number} : numéro hors de 1 à ${CARDS_PER_THEME}.`);
      }
      if (seen.has(c.number)) errors.push(`${label} : numéro ${c.number} en double.`);
      seen.add(c.number);
    }
    for (let n = 1; n <= CARDS_PER_THEME; n++) {
      if (!seen.has(n) && t.cards.length === CARDS_PER_THEME) {
        errors.push(`${label} : la carte ${n} est manquante.`);
      }
    }
  });
  return errors.length ? { ok: false, errors, warnings } : { ok: true, content, errors, warnings };
}
