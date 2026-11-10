import raw from './content.json';
import { builtInContent } from './index';
import { validateContent } from './validate';

const clone = () => structuredClone(raw) as typeof raw;

describe('content.json (200 cartes de la soirée)', () => {
  it('est valide : 10 thèmes × 20 cartes, sans avertissement', () => {
    const r = validateContent(raw);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ok).toBe(true);
    expect(builtInContent.themes).toHaveLength(10);
    for (const t of builtInContent.themes) {
      expect(t.cards.map((c) => c.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    }
  });

  it('contient 200 textes non vides, sans reste du format source (« V| » / « A| »)', () => {
    const cards = builtInContent.themes.flatMap((t) => t.cards);
    expect(cards).toHaveLength(200);
    for (const c of cards) {
      expect(c.text.trim().length).toBeGreaterThan(5);
      expect(c.text).not.toMatch(/^[VA]\|/);
      expect(['question', 'action']).toContain(c.type);
    }
    expect(cards.some((c) => c.type === 'question')).toBe(true);
    expect(cards.some((c) => c.type === 'action')).toBe(true);
  });

  it('les chronomètres sont des durées plausibles, réservées aux actions', () => {
    const timed = builtInContent.themes.flatMap((t) => t.cards).filter((c) => c.timer);
    expect(timed.length).toBeGreaterThan(10);
    for (const c of timed) {
      expect(c.type).toBe('action');
      expect(c.timer).toBeGreaterThanOrEqual(10);
      expect(c.timer).toBeLessThanOrEqual(120);
    }
  });

  it('a des noms, emojis et couleurs distincts', () => {
    const t = builtInContent.themes;
    expect(new Set(t.map((x) => x.emoji)).size).toBe(10);
    expect(new Set(t.map((x) => x.color)).size).toBe(10);
    expect(new Set(t.map((x) => x.name)).size).toBe(10);
  });
});

describe('validateContent', () => {
  it('avertit (sans bloquer) si le nombre de thèmes diffère de 10', () => {
    const c = clone();
    c.themes = c.themes.slice(0, 9);
    const r = validateContent(c);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toContain('9 thèmes');
  });

  it('signale un type invalide avec la carte et le champ', () => {
    const c = clone();
    (c.themes[1].cards[3] as { type: string }).type = 'devinette';
    const r = validateContent(c);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('Thème n°2');
    expect(r.errors[0]).toContain('carte 4');
    expect(r.errors[0]).toContain('« type »');
  });

  it('signale un numéro en double et une carte manquante', () => {
    const c = clone();
    c.themes[0].cards[4].number = 3;
    const r = validateContent(c);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('numéro 3 en double');
    expect(r.errors.join('\n')).toContain('la carte 5 est manquante');
  });

  it("signale un thème qui n'a pas 20 cartes", () => {
    const c = clone();
    c.themes[0].cards.pop();
    const r = validateContent(c);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('19 cartes (20 attendues)');
  });

  it('signale un timer invalide et une couleur invalide', () => {
    const c = clone();
    (c.themes[0].cards[1] as { timer: unknown }).timer = -5;
    c.themes[0].color = 'rose';
    const r = validateContent(c);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('« timer »'))).toBe(true);
    expect(r.errors.some((e) => e.includes('« color »'))).toBe(true);
  });

  it('signale des identifiants de thème en double', () => {
    const c = clone();
    c.themes[1].id = c.themes[0].id;
    expect(validateContent(c).errors.join('\n')).toContain('en double');
  });

  it('refuse un fichier qui n’est pas un contenu', () => {
    expect(validateContent({ foo: 1 }).ok).toBe(false);
    expect(validateContent(null).ok).toBe(false);
  });

  it('accepte points et timer facultatifs', () => {
    const c = clone();
    delete (c.themes[0].cards[0] as { points?: unknown }).points;
    delete (c.themes[0].cards[0] as { timer?: unknown }).timer;
    expect(validateContent(c).ok).toBe(true);
  });
});
