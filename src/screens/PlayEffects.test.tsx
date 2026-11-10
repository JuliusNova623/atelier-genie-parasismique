import 'fake-indexeddb/auto';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { deriveEffects } from '../engine/effects';
import { createGame, playerScores } from '../engine/game';
import { DEFAULT_RULES, type Game, type Player } from '../engine/types';
import { useGameStore } from '../store/game';
import { Play } from './Play';

const mk = (id: string, name: string): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
});

const THEMES = builtInContent.themes;

function gameOn(themeIdx: number, cardNumber: number): Game {
  const players = [mk('a', 'Alice'), mk('b', 'Bob'), mk('c', 'Chloé')];
  const g = createGame({
    now: 0,
    mode: 'solo',
    players,
    rules: DEFAULT_RULES,
    themes: THEMES.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
  return {
    ...g,
    pickerModes: Object.fromEntries(players.map((p) => [p.id, 'dice' as const])),
    pending: { stage: 'card', themeId: THEMES[themeIdx].id, cardNumber, revealed: true },
  };
}

async function show(game: Game) {
  await act(async () => {
    await useGameStore.getState().setGame(game);
  });
  return render(
    <MemoryRouter>
      <Play />
    </MemoryRouter>,
  );
}

const g = () => useGameStore.getState().game!;

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  useGameStore.setState({ interlude: null });
});
afterEach(() => vi.restoreAllMocks());

describe('cartes à effet : choisir un joueur qui prend le malus', () => {
  it('« Je le fais » ouvre la liste des joueurs, puis le malus est appliqué au joueur choisi', async () => {
    const user = userEvent.setup();
    // Thème 8, carte 3 : « le désigné prend le malus ».
    const card = THEMES[7].cards[2];
    expect(card.flow?.[0].do).toBe('pick');
    await show(gameOn(7, 3));

    await user.click(screen.getByRole('button', { name: /^Je (le fais|réponds)/ }));
    // La carte reste affichée et on choisit parmi les joueurs.
    expect(screen.getByText(card.text)).toBeInTheDocument();
    expect(document.querySelector('[data-step="pick"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /Bob/ }));

    // Étape malus : Bob boit la boisson tirée, sur la même page.
    expect(document.querySelector('[data-step="malus"]')).not.toBeNull();
    expect(document.querySelector('[data-effect="malus"][data-player="b"]')).not.toBeNull();
    expect(g().pending?.stage).toBe('flow');
    await user.click(screen.getByRole('button', { name: /J.ai bu/ }));

    // Le tour est terminé : carte réussie (+3 pour Alice), malus enregistré pour Bob.
    expect(g().pending).toBeNull();
    expect(g().log).toHaveLength(1);
    expect(g().log[0].outcome).toBe('done');
    expect(g().log[0].effects?.[0]).toMatchObject({ k: 'malus', to: 'b' });
    expect(playerScores(g()).a).toBe(3);
    expect(screen.getByRole('button', { name: /^Lancer la roulette$/ })).toBeVisible();
  });

  it('la partie reprend sur l’étape en cours après un rechargement', async () => {
    const user = userEvent.setup();
    await show(gameOn(7, 3));
    await user.click(screen.getByRole('button', { name: /^Je (le fais|réponds)/ }));
    const saved = JSON.parse(JSON.stringify(g())) as Game;

    useGameStore.setState({ game: null });
    const { unmount } = await show(saved);
    expect(document.querySelector('[data-step="pick"]')).not.toBeNull();
    unmount();
  });

  it('« Je bois » reste le seul refus : pas d’effet, on passe à la boisson', async () => {
    const user = userEvent.setup();
    await show(gameOn(7, 3));
    await user.click(screen.getByRole('button', { name: /^Je bois/ }));
    expect(g().pending?.stage).toBe('drink');
    expect(screen.queryByRole('button', { name: /Je ne bois pas|refus/i })).toBeNull();
  });
});

describe('règles en cours', () => {
  it('une contrainte de 3 tours apparaît, peut se terminer à la main, et s’éteint seule', async () => {
    const user = userEvent.setup();
    // Thème 5, carte 12 : contrainte de communication (règle de 3 tours).
    await show(gameOn(4, 12));
    await user.click(screen.getByRole('button', { name: /^Je (le fais|réponds)/ }));
    // Sans étape à jouer, le tour est déjà terminé et la règle est visible sur la roue.
    expect(g().pending).toBeNull();
    const panel = await screen.findByRole('region', { name: 'Règles en cours' });
    expect(panel).toBeVisible();
    expect(deriveEffects(g()).rules).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(deriveEffects(g()).rules).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Règles en cours' })).toBeNull();
  });
});
