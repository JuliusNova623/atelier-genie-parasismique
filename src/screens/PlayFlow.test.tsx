import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame, playerScores, remainingJokers } from '../engine/game';
import {
  DEFAULT_RULES,
  type Game,
  type PendingTurn,
  type Player,
  type Rules,
  type TurnEvent,
} from '../engine/types';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { QUESTION, TIMED_ACTION } from '../test/cards';
import { Play } from './Play';

const mk = (id: string, name: string, noAlcohol = false): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol,
});

function base(rules: Rules = DEFAULT_RULES, players = [mk('a', 'Alice'), mk('b', 'Bob')]): Game {
  const g = createGame({
    now: 0,
    mode: 'solo',
    players,
    rules,
    themes: builtInContent.themes.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
  // Ces tests pilotent le tirage à la main : on évite le mode « Direct » qui se déclenche seul.
  return { ...g, pickerModes: Object.fromEntries(players.map((p) => [p.id, 'dice' as const])) };
}

const card = (over: Partial<PendingTurn> = {}): PendingTurn => ({
  stage: 'card',
  themeId: QUESTION.themeId,
  cardNumber: QUESTION.number, // une question du contenu
  revealed: true,
  ...over,
});

const event = (over: Partial<TurnEvent>): TurnEvent => ({
  id: 'e',
  turnOwnerId: 'a',
  playerId: 'a',
  themeId: 'theme-1',
  cardNumber: 1,
  outcome: 'done',
  pointsDelta: 3,
  nextPlayerId: 'b',
  timestamp: 1,
  ...over,
});

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
});
afterEach(() => vi.restoreAllMocks());

describe('page de carte', () => {
  it('« Je réponds » (question) donne les points et passe au joueur suivant', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: card() });
    expect(screen.getByRole('heading', { name: `Carte n°${QUESTION.number}` })).toBeInTheDocument();
    expect(screen.getByText(/• Vérité •/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Je réponds \(\+3\)/ }));
    expect(playerScores(g())).toEqual({ a: 3, b: 0 });
    expect(await screen.findByRole('button', { name: 'Lancer la roulette' })).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('affiche « Je le fais » pour une action, avec son chronomètre', async () => {
    await show({
      ...base(),
      pending: card({ themeId: TIMED_ACTION.themeId, cardNumber: TIMED_ACTION.number }),
    });
    expect(screen.getByText(/• Action •/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Je le fais/ })).toBeInTheDocument();
    // Une action avec chronomètre : il est proposé.
    expect(screen.getByRole('group', { name: 'Chronomètre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer le chronomètre' })).toBeInTheDocument();
  });

  it('énigme : la réponse reste cachée jusqu’à « Voir la réponse »', async () => {
    const user = userEvent.setup();
    const riddle = builtInContent.themes[5].cards[0];
    await show({
      ...base(),
      pending: card({ themeId: 'theme-6', cardNumber: riddle.number }),
    });
    expect(screen.getByText(riddle.text)).toBeInTheDocument();
    expect(screen.queryByText(riddle.answer!)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Voir la réponse/ }));
    expect(screen.getByText(riddle.answer!)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voir la réponse/ })).not.toBeInTheDocument();
  });

  it('une carte sans énigme n’a pas de bouton de réponse', async () => {
    await show({ ...base(), pending: card() });
    expect(screen.queryByRole('button', { name: /Voir la réponse/ })).not.toBeInTheDocument();
  });

  it('« Je bois » mène à l’étape boisson (boire est obligatoire si on ne fait pas la carte)', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: card() });
    await user.click(screen.getByRole('button', { name: /^Je bois/ }));
    expect(g().pending).toMatchObject({ stage: 'drink' });
    expect(g().pending?.drinkNumber).toBeUndefined();
    expect(await screen.findByRole('heading', { name: 'Étape boisson' })).toBeInTheDocument();
    expect(screen.getByText(`Carte n°${QUESTION.number} : tu bois`)).toBeInTheDocument();
  });

  it('Double : s’active, double les points affichés et enregistrés', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: card() });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    expect(screen.getByRole('button', { name: /Double/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Je réponds \(\+6\)/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Je réponds/ }));
    expect(playerScores(g()).a).toBe(6);
    expect(remainingJokers(g(), 'a').double).toBe(0);
  });

  it('Double se désactive d’un second clic sans rien consommer', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: card() });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: /Double/ }));
    expect(g().pending?.joker).toBeUndefined();
    expect(screen.getByRole('button', { name: /Je réponds \(\+3\)/ })).toBeInTheDocument();
  });

  it('Passe saute la carte sans points ni boisson', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: card() });
    await user.click(screen.getByRole('button', { name: /Passe/ }));
    expect(g().log[0]).toMatchObject({ outcome: 'joker-pass', pointsDelta: 0 });
    expect(playerScores(g()).a).toBe(0);
    expect(await screen.findByRole('button', { name: 'Lancer la roulette' })).toBeInTheDocument();
  });

  it('Transfert : choisit un joueur, qui joue la carte et marque les points', async () => {
    const user = userEvent.setup();
    await show({
      ...base(DEFAULT_RULES, [mk('a', 'Alice'), mk('b', 'Bob'), mk('c', 'Chloé')]),
      pending: card(),
    });
    await user.click(screen.getByRole('button', { name: /Transfert/ }));
    const chooser = screen.getByRole('group', { name: 'Qui joue cette carte ?' });
    expect(within(chooser).queryByText(/Alice/)).not.toBeInTheDocument();
    await user.click(within(chooser).getByRole('button', { name: /Chloé/ }));
    expect(screen.getByText(/Alice a transféré la carte à Chloé/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Je réponds/ }));
    expect(playerScores(g())).toEqual({ a: 0, b: 0, c: 3 });
  });

  it('désactive les jokers épuisés et masque la barre si tous sont désactivés', async () => {
    const none: Rules = {
      ...DEFAULT_RULES,
      jokers: {
        pass: { enabled: true, count: 0 },
        double: { enabled: true, count: 1 },
        transfer: { enabled: true, count: 1 },
      },
    };
    const { unmount } = await show({ ...base(none), pending: card() });
    expect(screen.getByRole('button', { name: /Passe/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Double/ })).toBeEnabled();
    unmount();

    const off: Rules = {
      ...DEFAULT_RULES,
      jokers: {
        pass: { enabled: false, count: 1 },
        double: { enabled: false, count: 1 },
        transfer: { enabled: false, count: 1 },
      },
    };
    await show({ ...base(off), pending: card() });
    expect(screen.queryByRole('heading', { name: 'Jokers' })).not.toBeInTheDocument();
  });
});

describe('étape boisson', () => {
  const drink = (over: Partial<PendingTurn> = {}): PendingTurn => ({
    stage: 'drink',
    themeId: 'theme-3',
    cardNumber: 7,
    drinkNumber: 12,
    revealed: true,
    ...over,
  });

  it('affiche le nom de la boisson et « J’ai bu » donne le point boisson', async () => {
    const user = userEvent.setup();
    await useSettings.getState().load();
    await act(async () => {
      await useSettings
        .getState()
        .setDrinks(
          useSettings
            .getState()
            .drinks.map((d) => (d.number === 12 ? { ...d, name: 'Mojito' } : d)),
        );
    });
    await show({ ...base(), pending: drink() });
    expect(screen.getByText('Boisson n°12 : Mojito')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /J’ai bu \(\+1\)/ }));
    expect(g().log[0]).toMatchObject({ outcome: 'refused-drink', drinkNumber: 12 });
    expect(playerScores(g()).a).toBe(1);
  });

  it('affiche « Boisson n°X » si le nom est vide, et propose uniquement « J’ai bu » (pas de refus)', async () => {
    const user = userEvent.setup();
    await show({ ...base(), pending: drink({ drinkNumber: 5 }) });
    expect(screen.getByText('Boisson n°5 : Boisson n°5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Je ne bois pas/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /J’ai bu/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /J’ai bu/ }));
    expect(playerScores(g()).a).toBe(1);
  });

  it('joueur « sans alcool » : version sans alcool, nom conservé, mêmes points', async () => {
    const user = userEvent.setup();
    await show({
      ...base(DEFAULT_RULES, [mk('a', 'Alice', true), mk('b', 'Bob')]),
      pending: drink({ drinkNumber: 9 }),
    });
    expect(screen.getByText(/Version sans alcool : un verre d’eau ou un soft/)).toBeInTheDocument();
    expect(screen.getByText(/Boisson n°9/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /J’ai bu \(\+1\)/ }));
    expect(playerScores(g()).a).toBe(1);
  });

  it('adapte le tirage au nombre de boissons de la partie (titre et cartes)', async () => {
    const game = {
      ...base({ ...DEFAULT_RULES, drinkCount: 6 }),
      pending: drink({ drinkNumber: undefined, revealed: false }),
    };
    await useSettings.getState().update({ drinkCount: 20 });
    await show(game);
    expect(screen.getByRole('heading', { name: 'Tire ta boisson (1 à 6)' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Cartes/ }));
    expect(screen.getAllByRole('button', { name: /Carte face cachée/ })).toHaveLength(6);
  });

  it('n’affiche pas les boutons avant la fin de l’animation (résultat non révélé)', async () => {
    await show({ ...base(), pending: drink({ revealed: false }) });
    expect(screen.queryByRole('button', { name: /J’ai bu/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Boisson n°12/)).not.toBeInTheDocument();
  });

  it('transfert : la boisson concerne le joueur désigné, y compris « sans alcool »', async () => {
    await show({
      ...base(DEFAULT_RULES, [mk('a', 'Alice'), mk('b', 'Bob', true)]),
      pending: drink({ joker: 'transfer', transferTo: 'b' }),
    });
    expect(screen.getByText(/Version sans alcool/)).toBeInTheDocument();
  });
});

describe('tableau des scores', () => {
  it('classe les joueurs, montre les jokers et permet d’annuler le dernier tour', async () => {
    const user = userEvent.setup();
    const game: Game = {
      ...base(),
      log: [
        event({ id: 'e1' }),
        event({
          id: 'e2',
          turnOwnerId: 'b',
          playerId: 'b',
          cardNumber: 2,
          outcome: 'joker-pass',
          jokerUsed: 'pass',
          pointsDelta: 0,
          nextPlayerId: 'a',
        }),
      ],
    };
    await show(game);
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    const dialog = screen.getByRole('dialog', { name: 'Tableau des scores' });
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Alice');
    expect(rows[0]).toHaveTextContent('3');
    expect(rows[1]).toHaveTextContent('Bob');
    expect(rows[1]).toHaveTextContent('Passe 0');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler le dernier tour' }));
    expect(g().log).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('propose les onglets Équipes / Joueurs en mode équipes', async () => {
    const user = userEvent.setup();
    const game = createGame({
      now: 0,
      mode: 'teams',
      players: [
        { ...mk('a', 'Alice'), teamId: 'T1' },
        { ...mk('b', 'Bob'), teamId: 'T2' },
      ],
      teams: [
        { id: 'T1', name: 'Rouges', color: '#f00' },
        { id: 'T2', name: 'Bleus', color: '#00f' },
      ],
      rules: DEFAULT_RULES,
      themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
    });
    await show(game);
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Rouges')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Joueurs' }));
    expect(within(dialog).getByText('Alice')).toBeInTheDocument();
  });

  it('désactive l’annulation quand rien n’a été joué', async () => {
    const user = userEvent.setup();
    await show(base());
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    expect(screen.getByRole('button', { name: 'Annuler le dernier tour' })).toBeDisabled();
  });
});

describe('rappel d’hydratation', () => {
  it('apparaît après N cartes et se ferme avec OK', async () => {
    const user = userEvent.setup();
    const game: Game = { ...base({ ...DEFAULT_RULES, hydrationEvery: 1 }), log: [event({})] };
    await show(game);
    expect(screen.getByText(/ne prends pas le volant/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText(/ne prends pas le volant/)).not.toBeInTheDocument();
  });
});
