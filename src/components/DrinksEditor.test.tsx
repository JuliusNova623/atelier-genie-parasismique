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
    await useSettings.getState().update({ drinkCount: 20 });
    await useSettings
      .getState()
      .setDrinks(useSettings.getState().drinks.map((d) => ({ ...d, name: '', noAlcohol: false })));
  });
});

describe('éditeur des boissons', () => {
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

describe('nombre de boissons', () => {
  it('propose 20 boissons par défaut et permet d’en retirer ou d’en ajouter', async () => {
    const user = userEvent.setup();
    render(<DrinksEditor />);
    expect(screen.getByText('20 boissons')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Une boisson de plus' })).toBeDisabled();

    for (let i = 0; i < 8; i++) {
      await user.click(screen.getByRole('button', { name: 'Une boisson de moins' }));
    }
    expect(screen.getByText('12 boissons')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByRole('status')).toHaveTextContent('12 alcoolisées · 0 sans alcool');
    expect(screen.queryByLabelText('Nom de la boisson 13')).not.toBeInTheDocument();
    expect(useSettings.getState().drinkCount).toBe(12);
    expect(await repo.getSetting<{ drinkCount: number }>('prefs', { drinkCount: 0 })).toMatchObject(
      {
        drinkCount: 12,
      },
    );

    await user.click(screen.getByRole('button', { name: 'Une boisson de plus' }));
    expect(screen.getByText('13 boissons')).toBeInTheDocument();
  });

  it('ne descend pas sous 1 boisson et ne dépasse pas 20', async () => {
    const user = userEvent.setup();
    await act(async () => {
      await useSettings.getState().update({ drinkCount: 2 });
    });
    render(<DrinksEditor />);
    await user.click(screen.getByRole('button', { name: 'Une boisson de moins' }));
    expect(screen.getByText('1 boisson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Une boisson de moins' })).toBeDisabled();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('conserve les noms des boissons masquées quand on en remet', async () => {
    const user = userEvent.setup();
    render(<DrinksEditor />);
    await user.type(screen.getByLabelText('Nom de la boisson 15'), 'Rhum');
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Une boisson de moins' }));
    }
    expect(screen.queryByLabelText('Nom de la boisson 15')).not.toBeInTheDocument();
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Une boisson de plus' }));
    }
    expect(screen.getByLabelText('Nom de la boisson 15')).toHaveValue('Rhum');
  });

  it('« Toutes sans alcool » ne touche que les boissons en jeu', async () => {
    const user = userEvent.setup();
    await act(async () => {
      await useSettings.getState().update({ drinkCount: 3 });
    });
    render(<DrinksEditor />);
    await user.click(screen.getByRole('button', { name: /Toutes sans alcool/ }));
    expect(screen.getByRole('status')).toHaveTextContent('0 alcoolisée · 3 sans alcool');
    const all = useSettings.getState().drinks;
    expect(all.slice(0, 3).every((d) => d.noAlcohol)).toBe(true);
    expect(all.slice(3).every((d) => !d.noAlcohol)).toBe(true);
  });

  it('borne un nombre invalide relu depuis les réglages enregistrés', async () => {
    await repo.setSetting('prefs', { drinkCount: 99 });
    await act(async () => {
      await useSettings.getState().load();
    });
    expect(useSettings.getState().drinkCount).toBe(20);
    await repo.setSetting('prefs', { drinkCount: -3 });
    await act(async () => {
      await useSettings.getState().load();
    });
    expect(useSettings.getState().drinkCount).toBe(1);
    await repo.setSetting('prefs', { visualTheme: 'neon' });
    await act(async () => {
      await useSettings.getState().load();
    });
    expect(useSettings.getState().drinkCount).toBe(20);
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
