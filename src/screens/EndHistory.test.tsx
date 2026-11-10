import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { repo } from '../db/repo';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { endGame } from '../engine/results';
import { DEFAULT_RULES, type Game, type Player } from '../engine/types';
import { useGameStore } from '../store/game';
import { EndScreen } from './EndScreen';
import { HistoryScreen } from './HistoryScreen';

const mk = (id: string, name: string, teamId?: string): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

/** Alice: 2 cartes (6) · Bob: refus + boisson (1) · Chloé: refus sans boire (-2) */
function finished(id = 'g1'): Game {
  let g = createGame({
    id,
    now: 0,
    mode: 'solo',
    players: [mk('a', 'Alice'), mk('b', 'Bob'), mk('c', 'Chloé')],
    rules: DEFAULT_RULES,
    themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
  });
  const t = (n: number, outcome: 'done' | 'refused-drink' | 'refused-no-drink', now: number) =>
    (g = recordTurn(
      g,
      {
        themeId: 'theme-1',
        cardNumber: n,
        outcome,
        drinkNumber: outcome === 'done' ? undefined : 7,
      },
      now,
    ));
  t(1, 'done', 1); // Alice
  t(2, 'refused-drink', 2); // Bob
  t(3, 'refused-drink', 3); // Chloé
  t(4, 'done', 4); // Alice
  return endGame(g, 1000);
}

async function showEnd(game: Game) {
  await repo.archiveGame(game, game.endedAt ?? 1);
  return render(
    <MemoryRouter initialEntries={[`/end/${game.id}`]}>
      <Routes>
        <Route path="/end/:id" element={<EndScreen />} />
        <Route path="/play" element={<p>PLAY</p>} />
        <Route path="/new" element={<p>NEW</p>} />
        <Route path="/" element={<p>HOME</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe('écran de fin', () => {
  it('affiche le gagnant, le podium et le classement', async () => {
    await showEnd(finished());
    expect(await screen.findByRole('heading', { name: /Gagnants : 🏆 Alice/ })).toBeInTheDocument();
    const podium = screen.getByRole('list', { name: 'Podium' });
    const items = within(podium).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(podium).toHaveTextContent('Alice');
    expect(podium).toHaveTextContent('6 pts');
    expect(podium).toHaveTextContent('1 pt');
  });

  it('affiche les statistiques et les récompenses', async () => {
    await showEnd(finished());
    const stats = await screen.findByRole('region', { name: 'Statistiques' });
    expect(within(stats).getByText('Cartes faites').nextSibling).toHaveTextContent('2');
    expect(within(stats).getByText(/Cartes bues/).nextSibling).toHaveTextContent('2');
    // Boire est obligatoire : plus de ligne « boissons refusées » (sauf anciennes parties).
    expect(within(stats).queryByText(/Boissons refusées/)).not.toBeInTheDocument();
    expect(within(stats).getByText('Le plus courageux').nextSibling).toHaveTextContent('Alice');
    expect(within(stats).getByText('Le plus buveur').nextSibling).toHaveTextContent('Bob');
    expect(within(stats).getByText('Meilleure série')).toBeInTheDocument();
  });

  it('annonce une égalité', async () => {
    const g = finished('tie');
    g.log = g.log.slice(0, 2); // Alice 3, Bob 1 → on force l'égalité ci-dessous
    g.log[1] = { ...g.log[1], outcome: 'done', pointsDelta: 3, drinkNumber: undefined };
    await showEnd(g);
    expect(
      await screen.findByRole('heading', { name: /Égalité : 🏆 Alice & Bob/ }),
    ).toBeInTheDocument();
  });

  it('en mode équipes, affiche d’abord le podium des équipes', async () => {
    let g = createGame({
      id: 'teams',
      now: 0,
      mode: 'teams',
      players: [mk('a', 'Alice', 'T1'), mk('b', 'Bob', 'T2')],
      teams: [
        { id: 'T1', name: 'Rouges', color: '#f00' },
        { id: 'T2', name: 'Bleus', color: '#00f' },
      ],
      rules: DEFAULT_RULES,
      themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
    });
    g = recordTurn(g, { themeId: 'theme-1', cardNumber: 1, outcome: 'done' }, 1);
    await showEnd(endGame(g, 5));
    expect(await screen.findByRole('list', { name: 'Podium des équipes' })).toHaveTextContent(
      'Rouges',
    );
    expect(screen.getByRole('list', { name: 'Classement individuel' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Gagnants : 🏆 Rouges/ })).toBeInTheDocument();
  });

  it('« Rejouer avec les mêmes joueurs » crée une nouvelle partie à zéro', async () => {
    const user = userEvent.setup();
    await showEnd(finished());
    await user.click(await screen.findByRole('button', { name: 'Rejouer avec les mêmes joueurs' }));
    expect(await screen.findByText('PLAY')).toBeInTheDocument();
    const g = useGameStore.getState().game!;
    expect(g.players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Chloé']);
    expect(g.log).toHaveLength(0);
    expect(g.id).not.toBe('g1');
    expect((await repo.history()).map((h) => h.id)).toContain('g1');
  });

  it('« Nouvelle partie » mène à la création', async () => {
    const user = userEvent.setup();
    await showEnd(finished());
    await user.click(await screen.findByRole('button', { name: 'Nouvelle partie' }));
    expect(await screen.findByText('NEW')).toBeInTheDocument();
  });

  it('affiche un message si la partie est introuvable', async () => {
    render(
      <MemoryRouter initialEntries={['/end/inconnue']}>
        <Routes>
          <Route path="/end/:id" element={<EndScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Partie introuvable');
  });
});

describe('historique', () => {
  beforeEach(async () => {
    for (const g of await repo.history()) await repo.deleteHistoryGame(g.id);
  });

  it('affiche un état vide', async () => {
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Aucune partie terminée');
  });

  it('liste les parties (gagnant, scores) de la plus récente à la plus ancienne, et permet de supprimer', async () => {
    const user = userEvent.setup();
    await repo.archiveGame(finished('old'), 100);
    const recent = finished('recent');
    recent.players[0] = { ...recent.players[0], name: 'Zoé' };
    await repo.archiveGame(endGame(recent, 900), 900);
    render(
      <MemoryRouter>
        <HistoryScreen />
      </MemoryRouter>,
    );
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Zoé');
    expect(items[0]).toHaveTextContent('3 joueurs');
    expect(items[0]).toHaveTextContent('4 tours');
    expect(items[1]).toHaveTextContent('Alice');

    await act(async () => {
      await user.click(within(items[1]).getByRole('button', { name: /Supprimer/ }));
    });
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(await repo.getHistoryGame('old')).toBeUndefined();
  });
});
