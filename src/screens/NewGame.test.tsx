import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { repo } from '../db/repo';
import { useSettings } from '../store/settings';
import { NewGame } from './NewGame';

function setup() {
  render(
    <MemoryRouter initialEntries={['/new']}>
      <Routes>
        <Route path="/new" element={<NewGame />} />
        <Route path="/play" element={<p>PLAY</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function addPlayer(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(screen.getByLabelText('Nom du joueur'), name);
  await user.click(screen.getByRole('button', { name: 'Ajouter un joueur' }));
}

describe('NewGame', () => {
  it('bloque le lancement sous 2 joueurs puis crée et sauvegarde la partie', async () => {
    const user = userEvent.setup();
    setup();
    const start = screen.getByRole('button', { name: 'Lancer la partie' });
    expect(start).toBeDisabled();

    await addPlayer(user, 'Alice');
    expect(start).toBeDisabled();
    await addPlayer(user, 'Bob');
    expect(start).toBeEnabled();

    await user.click(start);
    expect(await screen.findByText('PLAY')).toBeInTheDocument();

    const game = await repo.loadCurrentGame();
    expect(game?.players.map((p) => p.name)).toEqual(['Alice', 'Bob']);
    expect(game?.themeIds).toHaveLength(10);
    expect(game?.rules.pointsCard).toBe(3);
    expect(game?.firstPlayerId).toBe(game?.players[0].id);
  });

  it('refuse un barème invalide (boisson bue ≥ carte)', async () => {
    const user = userEvent.setup();
    setup();
    await addPlayer(user, 'Alice');
    await addPlayer(user, 'Bob');
    const drunk = screen.getByLabelText('Boisson bue après un refus');
    await user.clear(drunk);
    await user.type(drunk, '5');
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('strictement inférieurs');
    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
  });

  it('refuse un nom en double', async () => {
    const user = userEvent.setup();
    setup();
    await addPlayer(user, 'Alice');
    await addPlayer(user, 'alice');
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('plusieurs fois');
    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
  });

  it('répartit les joueurs en équipes équilibrées en mode équipes', async () => {
    const user = userEvent.setup();
    setup();
    for (const n of ['A', 'B', 'C', 'D', 'E']) await addPlayer(user, n);
    await user.click(screen.getByRole('button', { name: 'Équipes' }));
    await waitFor(() => expect(screen.getAllByLabelText(/^Équipe : /)).toHaveLength(5));
    const values = screen
      .getAllByLabelText(/^Équipe : /)
      .map((s) => (s as HTMLSelectElement).value);
    const a = values.filter((v) => v === 'team-1').length;
    const b = values.filter((v) => v === 'team-2').length;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
  });

  it('fige dans la partie le nombre de boissons choisi dans les réglages', async () => {
    const user = userEvent.setup();
    await useSettings.getState().update({ drinkCount: 8 });
    setup();
    expect(screen.getByText(/Boissons : 8/)).toBeInTheDocument();
    await addPlayer(user, 'Alice');
    await addPlayer(user, 'Bob');
    await user.click(screen.getByRole('button', { name: 'Lancer la partie' }));
    await screen.findByText('PLAY');
    expect((await repo.loadCurrentGame())?.rules.drinkCount).toBe(8);

    // Changer le réglage ensuite n'affecte pas la partie déjà lancée.
    await useSettings.getState().update({ drinkCount: 3 });
    expect((await repo.loadCurrentGame())?.rules.drinkCount).toBe(8);
    await useSettings.getState().update({ drinkCount: 20 });
  });
});
