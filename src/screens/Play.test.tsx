import 'fake-indexeddb/auto';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { DEFAULT_RULES, type Game, type PendingTurn, type Player } from '../engine/types';
import { useGameStore } from '../store/game';
import { Play } from './Play';

const mk = (id: string): Player => ({
  id,
  name: id === 'a' ? 'Alice' : 'Bob',
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
});

function base(): Game {
  return createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a'), mk('b')],
    rules: DEFAULT_RULES,
    themes: builtInContent.themes.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
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

const withPending = (g: Game, pending: PendingTurn): Game => ({ ...g, pending });

describe('Play : écran dérivé de l’état de la partie', () => {
  it('affiche la roulette au repos et le joueur actif', async () => {
    await show(base());
    expect(screen.getByRole('button', { name: 'Lancer la roulette' })).toBeEnabled();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lancer la roulette des thèmes' }),
    ).toBeInTheDocument();
  });

  it('lancer la roulette fixe un thème avant l’animation (sauvegardé)', async () => {
    const user = userEvent.setup();
    await show(base());
    await user.click(screen.getByRole('button', { name: 'Lancer la roulette' }));
    const g = useGameStore.getState().game!;
    expect(g.pending).toMatchObject({ stage: 'theme', revealed: false });
    expect(screen.getByRole('button', { name: 'Lancer la roulette' })).toBeDisabled();
  });

  it('reprend une roue interrompue sans nouveau tirage', async () => {
    const g = withPending(base(), { stage: 'theme', themeId: 'theme-4', revealed: false });
    await show(g);
    expect(screen.getByRole('button', { name: 'Lancer la roulette' })).toBeDisabled();
    expect(useGameStore.getState().game!.pending!.themeId).toBe('theme-4');
  });

  it('affiche la page du thème : nom, cartes restantes, 4 modes', async () => {
    const g = withPending(base(), { stage: 'theme', themeId: 'theme-2', revealed: true });
    await show(g);
    expect(screen.getByRole('heading', { name: /Thème 2/ })).toBeInTheDocument();
    expect(screen.getByText(/20 cartes restantes/)).toBeInTheDocument();
    for (const label of ['Dé', 'Secouer', 'Cartes', 'Machine']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Dé/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('signale la dernière carte du thème et grille les numéros joués', async () => {
    let g = base();
    for (let n = 1; n <= 19; n++) {
      g = recordTurn(g, { themeId: 'theme-1', cardNumber: n, outcome: 'done' }, n);
    }
    await show(withPending(g, { stage: 'theme', themeId: 'theme-1', revealed: true }));
    expect(screen.getByText(/Dernière carte de ce thème/)).toBeInTheDocument();
    expect(screen.getByText(/1 carte restante/)).toBeInTheDocument();
    expect(screen.getByText('Numéros déjà joués')).toBeInTheDocument();
  });

  it('change et mémorise le mode de tirage du joueur', async () => {
    const user = userEvent.setup();
    await show(withPending(base(), { stage: 'theme', themeId: 'theme-1', revealed: true }));
    await user.click(screen.getByRole('button', { name: /Machine/ }));
    expect(useGameStore.getState().game!.pickerModes).toEqual({ a: 'slot' });
    expect(screen.getByRole('button', { name: 'Lancer la machine à sous' })).toBeInTheDocument();
  });
});
