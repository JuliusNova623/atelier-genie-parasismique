import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

test("affiche l'écran d'accueil", async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Roulette Soirée' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Nouvelle partie' })).toBeInTheDocument();
  expect(screen.queryByText(/Reprendre/)).not.toBeInTheDocument();
});
