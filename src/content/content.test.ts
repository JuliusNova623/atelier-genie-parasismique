import raw from './content.json';
import { builtInContent } from './index';
import { validateContent } from './validate';

const clone = () => structuredClone(raw) as typeof raw;

describe('content.json (200 cartes du PDF « jeux script »)', () => {
  const themes = builtInContent.themes;

  it('est valide : 10 thèmes × 20 cartes, sans avertissement', () => {
    const r = validateContent(raw);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ok).toBe(true);
    expect(themes).toHaveLength(10);
    for (const t of themes) {
      expect(t.cards.map((c) => c.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    }
  });

  it('reprend les 10 intitulés du PDF, dans l’ordre', () => {
    expect(themes.map((t) => t.name)).toEqual([
      'Secrets & Dossiers',
      'Défis & Alliances',
      'Vérités Inavouables',
      'Dilemmes Hardcore',
      'Impro & Théâtre',
      'Réflexion & Casse-tête',
      'Chance & Chaos',
      'Le Tribunal du Groupe',
      "Je n'ai jamais...",
      'Tyrannie des Règles',
    ]);
    for (const t of themes) {
      expect(t.short).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('sépare vérités et actions comme le PDF', () => {
    const kinds = (i: number) => themes[i].cards.map((c) => c.type);
    // Thème 1 : 10 vérités puis 10 actions.
    expect(kinds(0)).toEqual([...Array(10).fill('question'), ...Array(10).fill('action')]);
    for (const i of [1, 4, 6, 9]) expect(new Set(kinds(i))).toEqual(new Set(['action']));
    for (const i of [2, 3, 5, 7, 8]) expect(new Set(kinds(i))).toEqual(new Set(['question']));
  });

  it('contient 200 textes complets, sans reste de mise en forme du PDF', () => {
    const cards = themes.flatMap((t) => t.cards);
    expect(cards).toHaveLength(200);
    for (const c of cards) {
      expect(c.text.trim().length).toBeGreaterThan(30);
      expect(c.text).not.toMatch(/^\d+\./);
      expect(c.text).not.toMatch(/[\u200b\u00ad]/);
      expect(c.text).not.toMatch(/\s{2,}/);
      expect(c.text).not.toMatch(/\(Réponse/);
      expect(c.text).not.toMatch(/THÈME|\(20 (cartes|questions)/);
    }
    expect(new Set(cards.map((c) => c.text)).size).toBe(200);
  });

  it('préfixe les dilemmes (« Tu préfères… ») et le tribunal (« Qui de nous… »)', () => {
    for (const c of themes[3].cards) expect(c.text).toMatch(/^Tu préfères /);
    expect(themes[3].cards.every((c) => c.text.includes(' OU '))).toBe(true);
    expect(
      themes[7].cards.slice(0, 9).every((c) => c.text.startsWith('Qui de nous est capable de ')),
    ).toBe(true);
    expect(themes[7].cards[9].text).toBe(
      "Qui de nous a le plus d'ego au quotidien et refuse d'admettre ses torts ?",
    );
  });

  it('corrige les coquilles évidentes du PDF', () => {
    const all = themes.flatMap((t) => t.cards.map((c) => c.text)).join(' | ');
    expect(all).not.toContain("Je n'ai jamais me suis");
    expect(all).not.toContain('Je n me suis');
    expect(all).not.toContain('tords');
    expect(all).toContain('Je ne me suis jamais trompé de prénom');
  });

  it('isole les réponses des casse-têtes (thème 6) : cachées sur la carte, pas dans le texte', () => {
    for (const c of themes[5].cards) {
      expect(c.answer, `carte ${c.number}`).toBeTruthy();
    }
    expect(themes[5].cards[0].text).toBe("Logique : Combien de mois dans l'année ont 28 jours ?");
    expect(themes[5].cards[0].answer).toBe('Tous les 12 mois');
    expect(themes[5].cards[19].answer).toBe("L'allumette");
    // Aucune autre carte n'a de réponse cachée.
    expect(
      themes
        .filter((_, i) => i !== 5)
        .flatMap((t) => t.cards)
        .some((c) => c.answer),
    ).toBe(false);
  });

  it('les chronomètres sont des durées plausibles (5 s à 5 min), réservées aux actions', () => {
    const timed = themes.flatMap((t) => t.cards).filter((c) => c.timer);
    expect(timed.length).toBeGreaterThan(8);
    for (const c of timed) {
      expect(c.type).toBe('action');
      expect(c.timer).toBeGreaterThanOrEqual(5);
      expect(c.timer).toBeLessThanOrEqual(300);
    }
    // « Tu dois tenir deux minutes… » → 120 s ; « en moins de 5 secondes » → 5 s.
    expect(themes[0].cards[18].timer).toBe(120);
    expect(themes[9].cards[8].timer).toBe(5);
    // « Pendant 5 minutes… » → 300 s ; aucune durée au-delà.
    expect(themes[1].cards[15].timer).toBe(300);
  });

  it('a des noms, emojis et couleurs distincts', () => {
    expect(new Set(themes.map((x) => x.emoji)).size).toBe(10);
    expect(new Set(themes.map((x) => x.color)).size).toBe(10);
    expect(new Set(themes.map((x) => x.name)).size).toBe(10);
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
