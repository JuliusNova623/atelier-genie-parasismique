import raw from './content.json';
import { builtInContent } from './index';
import { validateContent } from './validate';

const clone = () => structuredClone(raw) as typeof raw;

describe('content.json provisoire', () => {
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

  it('alterne questions et actions avec un texte provisoire', () => {
    const c = builtInContent.themes[2].cards[6];
    expect(c.type).toBe('question');
    expect(c.text).toBe('[Thème 3 – Carte 7] Question provisoire');
    expect(builtInContent.themes[2].cards[7].type).toBe('action');
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
