import 'fake-indexeddb/auto';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { repo } from '../db/repo';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { DEFAULT_RULES, type Game, type Player, type Rules } from '../engine/types';
import { useGameStore } from '../store/game';
import { EndScreen } from './EndScreen';
import { Home } from './Home';
import { Play } from './Play';

const mk = (id: string, name: string): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
});

const game = (rules: Rules = DEFAULT_RULES, cards = createDeck(20)): Game =>
  createGame({
    id: 'live',
    now: 0,
    mode: 'solo',
    players: [mk('a', 'Alice'), mk('b', 'Bob')],
    rules,
    themes: [{ id: 'theme-1', cardNumbers: cards }],
  });

async function show(g: Game) {
  await act(async () => {
    await useGameStore.getState().setGame(g);
  });
  return render(
    <MemoryRouter initialEntries={['/play']}>
      <Routes>
        <Route path="/play" element={<Play />} />
        <Route path="/end/:id" element={<EndScreen />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe('terminer la partie', () => {
  it('« Terminer la partie » (avec confirmation) archive la partie et ouvre l’écran de fin', async () => {
    const user = userEvent.setup();
    const g = recordTurn(game(), { themeId: 'theme-1', cardNumber: 1, outcome: 'done' }, 1);
    await show(g);
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'Terminer la partie' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('historique'));
    expect(await screen.findByRole('heading', { name: 'Fin de la partie' })).toBeInTheDocument();
    expect(useGameStore.getState().game).toBeNull();
    expect(await repo.loadCurrentGame()).toBeUndefined();
    const archived = await repo.getHistoryGame('live');
    expect(archived?.endedAt).toBeTypeOf('number');
    expect(archived?.log).toHaveLength(1);
  });

  it('ne termine rien si l’utilisateur annule la confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    await show(game());
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'Terminer la partie' }));
    expect(useGameStore.getState().game).not.toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('propose Terminer / Continuer quand le score cible est atteint, et ne reposera pas la question', async () => {
    const user = userEvent.setup();
    const rules: Rules = { ...DEFAULT_RULES, end: { ...DEFAULT_RULES.end, targetScore: 3 } };
    const g = recordTurn(game(rules), { themeId: 'theme-1', cardNumber: 1, outcome: 'done' }, 1);
    await show(g);
    expect(screen.getByRole('alert')).toHaveTextContent('score cible atteint');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.queryByText(/Condition de fin atteinte/)).not.toBeInTheDocument();
    expect(useGameStore.getState().game?.endDismissed).toEqual(['score']);
    expect(await repo.loadCurrentGame()).toMatchObject({ endDismissed: ['score'] });
  });

  it('« Terminer » dans l’alerte ouvre l’écran de fin', async () => {
    const user = userEvent.setup();
    const rules: Rules = { ...DEFAULT_RULES, end: { ...DEFAULT_RULES.end, maxRounds: 1 } };
    let g = game(rules);
    g = recordTurn(g, { themeId: 'theme-1', cardNumber: 1, outcome: 'done' }, 1);
    g = recordTurn(g, { themeId: 'theme-1', cardNumber: 2, outcome: 'done' }, 2);
    await show(g);
    expect(screen.getByRole('alert')).toHaveTextContent('tous les joueurs ont fait leurs tours');
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(await screen.findByRole('heading', { name: 'Fin de la partie' })).toBeInTheDocument();
  });

  it('ne propose rien tant qu’aucune condition n’est atteinte', async () => {
    await show(game());
    expect(screen.queryByText(/Condition de fin atteinte/)).not.toBeInTheDocument();
  });

  it('termine automatiquement quand toutes les cartes sont jouées', async () => {
    const g = recordTurn(
      recordTurn(
        game(DEFAULT_RULES, [1, 2]),
        {
          themeId: 'theme-1',
          cardNumber: 1,
          outcome: 'done',
        },
        1,
      ),
      { themeId: 'theme-1', cardNumber: 2, outcome: 'refused-drink', drinkNumber: 3 },
      2,
    );
    await show(g);
    expect(await screen.findByRole('heading', { name: 'Fin de la partie' })).toBeInTheDocument();
    expect((await repo.getHistoryGame('live'))?.log).toHaveLength(2);
    expect(await repo.loadCurrentGame()).toBeUndefined();
  });
});
