import { createDeck } from './deck';
import { createGame, recordTurn, remainingCards, undoLast } from './game';
import {
  availableThemes,
  drawCardNumber,
  drawTheme,
  pickerModeFor,
  playedCards,
  rememberPickerMode,
  revealPending,
} from './turn';
import { DEFAULT_RULES, type Game, type Player } from './types';

const mk = (id: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

const newGame = (themeIds = ['t1', 't2', 't3']): Game =>
  createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a'), mk('b')],
    rules: DEFAULT_RULES,
    themes: themeIds.map((id) => ({ id, cardNumbers: createDeck(20) })),
  });

/** Joue un tour complet : roue, carte, validation. */
function playTurn(g: Game, now: number): Game {
  g = revealPending(drawTheme(g));
  g = revealPending(drawCardNumber(g));
  const p = g.pending!;
  return recordTurn(g, { themeId: p.themeId, cardNumber: p.cardNumber!, outcome: 'done' }, now);
}

describe('drawTheme', () => {
  it('fixe le thème avant la révélation', () => {
    const g = drawTheme(newGame());
    expect(g.pending).toMatchObject({ stage: 'theme', revealed: false });
    expect(['t1', 't2', 't3']).toContain(g.pending!.themeId);
    expect(revealPending(g).pending!.revealed).toBe(true);
  });

  it('interdit un second tirage tant que le premier n’est pas terminé', () => {
    expect(() => drawTheme(drawTheme(newGame()))).toThrow();
  });

  it('est uniforme entre les thèmes (3000 tirages, χ² 2 ddl < 20)', () => {
    const counts: Record<string, number> = { t1: 0, t2: 0, t3: 0 };
    const g = newGame();
    for (let i = 0; i < 3000; i++) counts[drawTheme(g).pending!.themeId]++;
    const chi = Object.values(counts).reduce((s, c) => s + (c - 1000) ** 2 / 1000, 0);
    expect(chi).toBeLessThan(20);
  });

  it('exclut les thèmes épuisés et échoue quand il n’en reste plus', () => {
    let g = createGame({
      now: 0,
      mode: 'solo',
      players: [mk('a'), mk('b')],
      rules: DEFAULT_RULES,
      themes: [
        { id: 'x', cardNumbers: [1] },
        { id: 'y', cardNumbers: [1, 2] },
      ],
    });
    g = recordTurn(g, { themeId: 'x', cardNumber: 1, outcome: 'done' }, 1);
    expect(availableThemes(g)).toEqual(['y']);
    for (let i = 0; i < 50; i++) expect(drawTheme(g).pending!.themeId).toBe('y');
    g = recordTurn(g, { themeId: 'y', cardNumber: 1, outcome: 'done' }, 2);
    g = recordTurn(g, { themeId: 'y', cardNumber: 2, outcome: 'done' }, 3);
    expect(availableThemes(g)).toEqual([]);
    expect(() => drawTheme(g)).toThrow('épuisés');
  });
});

describe('drawCardNumber', () => {
  it('exige un thème déjà révélé', () => {
    expect(() => drawCardNumber(newGame())).toThrow();
    expect(() => drawCardNumber(drawTheme(newGame()))).toThrow();
  });

  it('ne tire jamais un numéro déjà joué et épuise exactement 20 cartes', () => {
    let g = newGame(['t1']);
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      g = revealPending(drawTheme(g));
      g = revealPending(drawCardNumber(g));
      const n = g.pending!.cardNumber!;
      expect(seen.has(n)).toBe(false);
      expect(remainingCards(g, 't1')).toContain(n);
      seen.add(n);
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, i);
    }
    expect(seen.size).toBe(20);
    expect(availableThemes(g)).toEqual([]);
  });

  it('ne tire que parmi les numéros restants quand il en reste un', () => {
    let g = newGame(['t1']);
    for (let n = 1; n <= 19; n++) {
      g = recordTurn(g, { themeId: 't1', cardNumber: n, outcome: 'done' }, n);
    }
    for (let i = 0; i < 20; i++) {
      const d = drawCardNumber(revealPending(drawTheme(g)));
      expect(d.pending!.cardNumber).toBe(20);
    }
  });
});

describe('persistance du tour en cours', () => {
  it('survit à un aller-retour JSON (fermeture de l’app) sans nouveau tirage', () => {
    const g = drawCardNumber(revealPending(drawTheme(newGame())));
    const restored = JSON.parse(JSON.stringify(g)) as Game;
    expect(restored.pending).toEqual(g.pending);
    expect(restored.pending!.revealed).toBe(false);
  });

  it('est effacé par la validation du tour et par l’annulation', () => {
    let g = newGame();
    g = playTurn(g, 1);
    expect(g.pending).toBeNull();
    g = drawTheme(g);
    expect(g.pending).not.toBeNull();
    expect(undoLast(g).pending).toBeNull();
  });

  it('enchaîne plusieurs tours complets sans jamais rejouer une carte', () => {
    let g = newGame();
    for (let i = 0; i < 25; i++) g = playTurn(g, i);
    expect(g.log).toHaveLength(25);
    const keys = new Set(g.log.map((e) => `${e.themeId}:${e.cardNumber}`));
    expect(keys.size).toBe(25);
  });
});

describe('mode de tirage mémorisé', () => {
  it('présélectionne le dernier mode du joueur actif', () => {
    let g = newGame();
    expect(pickerModeFor(g)).toBe('auto'); // tirage direct par défaut
    g = rememberPickerMode(g, 'slot');
    expect(pickerModeFor(g)).toBe('slot');
    expect(pickerModeFor(g, 'b')).toBe('auto');
  });
});

describe('playedCards', () => {
  it('liste les numéros grillés du thème', () => {
    let g = newGame(['t1']);
    g = recordTurn(g, { themeId: 't1', cardNumber: 7, outcome: 'done' }, 1);
    g = recordTurn(g, { themeId: 't1', cardNumber: 3, outcome: 'done' }, 2);
    expect(playedCards(g, 't1')).toEqual([3, 7]);
  });
});
