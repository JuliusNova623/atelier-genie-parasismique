import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame } from '../engine/game';
import { DEFAULT_RULES, type Game, type PendingTurn, type Player } from '../engine/types';
import { AutoPick } from '../pickers/AutoPick';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { QUESTION } from '../test/cards';
import { resolveDisplay } from '../util/display';
import { Home } from './Home';
import { Play } from './Play';
import { hotkeysFor, screenOf } from './play/useHotkeys';

const mk = (id: string, name: string, teamId?: string): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

function game(pending: PendingTurn | null = null, teams = false): Game {
  const g = createGame({
    now: 0,
    mode: teams ? 'teams' : 'solo',
    players: [
      mk('a', 'Alice', teams ? 'T1' : undefined),
      mk('b', 'Bob', teams ? 'T2' : undefined),
      mk('c', 'Chloé', teams ? 'T1' : undefined),
    ],
    teams: teams
      ? [
          { id: 'T1', name: 'Rouges', color: '#f00' },
          { id: 'T2', name: 'Bleus', color: '#00f' },
        ]
      : [],
    rules: DEFAULT_RULES,
    themes: builtInContent.themes.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
  return { ...g, pending, pickerModes: { a: 'dice', b: 'dice', c: 'dice' } };
}

/** Simule un écran large (TV) ou étroit (téléphone). */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function show(g: Game) {
  await act(async () => {
    await useGameStore.getState().setGame(g);
  });
  return render(
    <MemoryRouter>
      <Play />
    </MemoryRouter>,
  );
}

const card: PendingTurn = {
  stage: 'card',
  themeId: QUESTION.themeId,
  cardNumber: QUESTION.number,
  revealed: true,
};

beforeEach(async () => {
  await act(async () => {
    await useSettings.getState().load();
    await useSettings.getState().update({ display: 'auto', sound: false, haptics: false });
  });
});
afterEach(() => {
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe('choix de l’affichage', () => {
  it('Auto : TV sur grand écran paysage, téléphone sinon ; les modes forcés priment', () => {
    expect(resolveDisplay('auto', true)).toBe('tv');
    expect(resolveDisplay('auto', false)).toBe('phone');
    expect(resolveDisplay('tv', false)).toBe('tv');
    expect(resolveDisplay('phone', true)).toBe('phone');
  });
});

describe('mode écran : scores en direct et raccourcis', () => {
  it('sur grand écran, affiche les scores en direct avec le joueur actif en évidence', async () => {
    setWide(true);
    await show(game());
    const live = screen.getByRole('region', { name: 'Scores en direct' });
    const items = within(live).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.filter((li) => li.getAttribute('data-active') === 'true')).toHaveLength(1);
    expect(items.find((li) => li.getAttribute('data-active') === 'true')).toHaveTextContent(
      'Alice',
    );
    expect(screen.getByText('Raccourcis clavier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plein écran/ })).toBeInTheDocument();
  });

  it('sur téléphone, le panneau de scores n’est pas rendu', async () => {
    setWide(false);
    await show(game());
    expect(screen.queryByRole('region', { name: 'Scores en direct' })).not.toBeInTheDocument();
    expect(screen.queryByText('Raccourcis clavier')).not.toBeInTheDocument();
  });

  it('le réglage « Écran TV » force le mode écran même sur un petit écran', async () => {
    setWide(false);
    await act(async () => {
      await useSettings.getState().update({ display: 'tv' });
    });
    await show(game());
    expect(screen.getByRole('region', { name: 'Scores en direct' })).toBeInTheDocument();
  });

  it('en mode équipes, affiche aussi le classement des équipes', async () => {
    setWide(true);
    await show(game(null, true));
    const live = screen.getByRole('region', { name: 'Scores en direct' });
    expect(within(live).getAllByRole('list')).toHaveLength(2);
    expect(within(live).getByText('Rouges')).toBeInTheDocument();
  });

  it('l’aide des raccourcis suit l’écran affiché', async () => {
    setWide(true);
    await show(game(card));
    const help = screen.getByLabelText('Raccourcis clavier');
    expect(within(help).getByText('Fait')).toBeInTheDocument();
    expect(within(help).getByText('Je bois')).toBeInTheDocument();
    expect(within(help).getByText('Passe')).toBeInTheDocument();
  });
});

describe('raccourcis clavier', () => {
  it('associe les touches à l’écran courant', () => {
    expect(screenOf(game())).toBe('wheel');
    expect(Object.keys(hotkeysFor(game()))).toEqual(['space']);
    expect(Object.keys(hotkeysFor(game(card))).sort()).toEqual(['b', 'p', 'space']);
    const drinkIdle: PendingTurn = {
      stage: 'drink',
      themeId: 'theme-1',
      cardNumber: 1,
      revealed: false,
    };
    expect(screenOf(game(drinkIdle))).toBe('drink');
    expect(Object.keys(hotkeysFor(game(drinkIdle)))).toEqual(['space']);
    expect(
      Object.keys(hotkeysFor(game({ ...drinkIdle, drinkNumber: 3, revealed: true }))).sort(),
    ).toEqual(['b', 'space']);
  });

  it('Espace lance la roue : le thème est tiré', async () => {
    setWide(true);
    await show(game());
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    await waitFor(() => expect(useGameStore.getState().game!.pending?.stage).toBe('theme'));
  });

  it('Espace valide la carte (+3) et B = « Je bois »', async () => {
    setWide(true);
    const { unmount } = await show(game(card));
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    await waitFor(() => expect(useGameStore.getState().game!.log).toHaveLength(1));
    expect(useGameStore.getState().game!.log[0].outcome).toBe('done');
    unmount();

    await show(game(card));
    fireEvent.keyDown(window, { key: 'b' });
    await waitFor(() => expect(useGameStore.getState().game!.pending?.stage).toBe('drink'));
  });

  it('à l’étape boisson : Espace tire le numéro de la boisson', async () => {
    const drinkIdle: PendingTurn = {
      stage: 'drink',
      themeId: card.themeId,
      cardNumber: 1,
      revealed: false,
    };
    await show(game(drinkIdle));
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    await waitFor(() => expect(useGameStore.getState().game!.pending?.drinkNumber).toBeDefined());
  });

  it('B ou Espace sur une boisson révélée = « J’ai bu » (+1) ; la touche N ne fait plus rien', async () => {
    const revealed: PendingTurn = {
      stage: 'drink',
      themeId: card.themeId,
      cardNumber: 1,
      drinkNumber: 4,
      revealed: true,
    };
    await show(game(revealed));
    fireEvent.keyDown(window, { key: 'n' });
    await new Promise((r) => setTimeout(r, 40));
    expect(useGameStore.getState().game!.log).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'b' });
    await waitFor(() => expect(useGameStore.getState().game!.log).toHaveLength(1));
    expect(useGameStore.getState().game!.log[0]).toMatchObject({
      outcome: 'refused-drink',
      pointsDelta: 1,
    });
  });

  it('ignore les touches pendant la saisie de texte, avec un panneau ouvert, ou avec Ctrl', async () => {
    const user = userEvent.setup();
    await show(game(card));

    // Un champ de texte monté dans la page reçoit la frappe : aucune action de jeu.
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { code: 'Space', key: ' ' });
    input.remove();

    // Ctrl + R (rechargement du navigateur) ne doit pas refuser la carte.
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });

    // Panneau des scores ouvert : les raccourcis sont suspendus.
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    await new Promise((r) => setTimeout(r, 50));
    expect(useGameStore.getState().game!.log).toHaveLength(0);
    expect(useGameStore.getState().game!.pending?.stage).toBe('card');
  });

  it('ignore la répétition automatique d’une touche maintenue', async () => {
    await show(game(card));
    fireEvent.keyDown(window, { code: 'Space', key: ' ', repeat: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(useGameStore.getState().game!.log).toHaveLength(0);
  });
});

describe('tirage « Direct »', () => {
  const base = { max: 20, excluded: [], reduced: true, onDone: vi.fn() };

  it('se déclenche tout seul, une seule fois, sans toucher à rien', () => {
    const onTrigger = vi.fn();
    const { rerender } = render(<AutoPick {...base} target={null} onTrigger={onTrigger} />);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    rerender(<AutoPick {...base} target={null} onTrigger={onTrigger} />);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('ne retire pas un numéro déjà tiré (reprise) et joue l’animation jusqu’au résultat', async () => {
    const onTrigger = vi.fn();
    const onDone = vi.fn();
    render(<AutoPick {...base} target={9} onTrigger={onTrigger} onDone={onDone} />);
    expect(onTrigger).not.toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(9));
  });
});

describe('boutons d’accueil et réglages de l’affichage', () => {
  it('le bouton « Mode écran » active le mode TV, puis permet de revenir au téléphone', async () => {
    const user = userEvent.setup();
    setWide(false);
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /Mode écran/ }));
    await waitFor(() => expect(useSettings.getState().display).toBe('tv'));
    await user.click(await screen.findByRole('button', { name: /Revenir au mode téléphone/ }));
    await waitFor(() => expect(useSettings.getState().display).toBe('phone'));
  });
});
