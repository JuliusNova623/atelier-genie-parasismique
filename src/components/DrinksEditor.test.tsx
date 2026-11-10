import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { repo } from '../db/repo';
import { DrinksScreen } from '../screens/DrinksScreen';
import { Home } from '../screens/Home';
import { drinkLabel, useSettings } from '../store/settings';
import { DrinksEditor } from './DrinksEditor';

beforeEach(async () => {
  await act(async () => {
    await useSettings.getState().load();
    await useSettings
      .getState()
      .setDrinks(useSettings.getState().drinks.map((d) => ({ ...d, name: '', noAlcohol: false })));
  });
});

describe('éditeur des 20 boissons', () => {
  it('affiche les 20 boissons, toutes alcoolisées et sans nom au départ', () => {
    render(<DrinksEditor />);
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByRole('status')).toHaveTextContent('20 alcoolisées · 0 sans alcool');
    expect(screen.getByLabelText('Nom de la boisson 7')).toHaveAttribute(
      'placeholder',
      'Boisson n°7',
    );
    for (const sw of screen.getAllByRole('switch'))
      expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('enregistre le nom saisi (et « Boisson n°X » s’affiche tant qu’il est vide)', async () => {
    const user = userEvent.setup();
    render(<DrinksEditor />);
    await user.type(screen.getByLabelText('Nom de la boisson 3'), 'Mojito');
    expect(drinkLabel(useSettings.getState().drinks, 3)).toBe('Mojito');
    expect(drinkLabel(useSettings.getState().drinks, 4)).toBe('Boisson n°4');
    // persisté en base
    const saved = await repo.getDrinks();
    expect(saved[2].name).toBe('Mojito');
  });

  it('bascule une boisson entre alcoolisée et sans alcool, avec le compteur', async () => {
    const user = userEvent.setup();
    render(<DrinksEditor />);
    const sw = screen.getByRole('switch', { name: 'Boisson 5 sans alcool' });
    expect(sw).toHaveTextContent('Alcoolisée');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(sw).toHaveTextContent('Sans alcool');
    expect(screen.getByRole('status')).toHaveTextContent('19 alcoolisées · 1 sans alcool');
    expect((await repo.getDrinks())[4].noAlcohol).toBe(true);
    await user.click(sw);
    expect(screen.getByRole('status')).toHaveTextContent('20 alcoolisées · 0 sans alcool');
  });

  it('« Toutes sans alcool » puis « Toutes alcoolisées »', async () => {
    const user = userEvent.setup();
    render(<DrinksEditor />);
    await user.click(screen.getByRole('button', { name: /Toutes sans alcool/ }));
    expect(screen.getByRole('status')).toHaveTextContent('0 alcoolisée · 20 sans alcool');
    await user.click(screen.getByRole('button', { name: /Toutes alcoolisées/ }));
    expect(screen.getByRole('status')).toHaveTextContent('20 alcoolisées · 0 sans alcool');
  });

  it('conserve les modifications après rechargement des réglages', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DrinksEditor />);
    await user.type(screen.getByLabelText('Nom de la boisson 1'), 'Bière');
    await user.click(screen.getByRole('switch', { name: 'Boisson 2 sans alcool' }));
    unmount();
    await act(async () => {
      useSettings.setState({ drinks: [] });
      await useSettings.getState().load();
    });
    render(<DrinksEditor />);
    expect(screen.getByLabelText('Nom de la boisson 1')).toHaveValue('Bière');
    expect(screen.getByRole('switch', { name: 'Boisson 2 sans alcool' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('accès aux boissons', () => {
  it('l’accueil propose un bouton « Boissons » qui ouvre la page dédiée', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
        <DrinksScreen />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(nav).getByRole('button', { name: /Boissons/ })).toBeInTheDocument();
    await user.click(within(nav).getByRole('button', { name: /Boissons/ }));
  });
});
