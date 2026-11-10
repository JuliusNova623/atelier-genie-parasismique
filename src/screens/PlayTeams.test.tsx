import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame, playerScores, teamScores } from '../engine/game';
import {
  DEFAULT_RULES,
  type Game,
  type PendingTurn,
  type Player,
  type Rules,
} from '../engine/types';
import { useGameStore } from '../store/game';
import { Play } from './Play';

const mk = (id: string, name: string, teamId: string): Player => ({
  id,
  name,
  color: '#ff2fb3',
  avatar: '🙂',
  noAlcohol: false,
  teamId,
});

const teams = [
  { id: 'T1', name: 'Rouges', color: '#f00' },
  { id: 'T2', name: 'Bleus', color: '#00f' },
];

function teamGame(
  teamRules: Partial<Rules['teamRules']> = {},
  pending: PendingTurn | null = null,
): Game {
  return {
    ...createGame({
      now: 0,
      mode: 'teams',
      players: [
        mk('a1', 'Alice', 'T1'),
        mk('b1', 'Bob', 'T2'),
        mk('a2', 'Anna', 'T1'),
        mk('b2', 'Ben', 'T2'),
      ],
      teams,
      rules: { ...DEFAULT_RULES, teamRules: { ...DEFAULT_RULES.teamRules, ...teamRules } },
      themes: builtInContent.themes.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
    }),
    pending,
  };
}

const card = (over: Partial<PendingTurn> = {}): PendingTurn => ({
  stage: 'card',
  themeId: 'theme-3',
  cardNumber: 7,
  revealed: true,
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

describe('l’adversaire décide', () => {
  it('annonce le décideur adverse et remplace faire/refuser par « Doit le faire / Doit boire »', async () => {
    await show(teamGame({ opponentDecides: true }, card({ deciderId: 'b2' })));
    expect(screen.getByText(/Ben \(équipe adverse\) décide pour Alice/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Doit le faire \(\+3\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doit boire' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Je refuse' })).not.toBeInTheDocument();
  });

  it('« Doit le faire » donne les points ; le décideur est tracé dans le journal', async () => {
    const user = userEvent.setup();
    await show(teamGame({ opponentDecides: true }, card({ deciderId: 'b2' })));
    await user.click(screen.getByRole('button', { name: /Doit le faire/ }));
    expect(playerScores(g()).a1).toBe(3);
    expect(g().log[0].deciderId).toBe('b2');
  });

  it('« Doit boire » mène à l’étape boisson', async () => {
    const user = userEvent.setup();
    await show(teamGame({ opponentDecides: true }, card({ deciderId: 'b1' })));
    await user.click(screen.getByRole('button', { name: 'Doit boire' }));
    expect(await screen.findByRole('heading', { name: 'Étape boisson' })).toBeInTheDocument();
    expect(g().pending?.deciderId).toBe('b1');
  });

  it('laisse Passe et Transfert utilisables', async () => {
    await show(teamGame({ opponentDecides: true }, card({ deciderId: 'b1' })));
    expect(screen.getByRole('button', { name: /Passe/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Transfert/ })).toBeEnabled();
  });

  it('sans la règle, les boutons restent « Je réponds / Je refuse »', async () => {
    await show(teamGame({}, card()));
    expect(screen.getByRole('button', { name: 'Je refuse' })).toBeInTheDocument();
    expect(screen.queryByText(/équipe adverse/)).not.toBeInTheDocument();
  });
});

describe('duel', () => {
  it('propose le duel seulement avec la règle activée', async () => {
    const { unmount } = await show(teamGame({}, card()));
    expect(screen.queryByRole('button', { name: /Lancer un duel/ })).not.toBeInTheDocument();
    unmount();
    await show(teamGame({ duel: true }, card()));
    expect(screen.getByRole('button', { name: /Lancer un duel/ })).toBeInTheDocument();
  });

  it('choisit deux joueurs d’équipes différentes, puis le groupe désigne le vainqueur', async () => {
    const user = userEvent.setup();
    await show(teamGame({ duel: true }, card()));
    await user.click(screen.getByRole('button', { name: /Lancer un duel/ }));

    const picker = screen.getByRole('group', { name: 'Duel' });
    expect(within(picker).getByText('Premier duelliste')).toBeInTheDocument();
    await user.click(within(picker).getByRole('button', { name: /Anna/ }));

    // Le second duelliste est forcément d’une autre équipe que le premier.
    expect(within(picker).getByText('Adversaire (autre équipe)')).toBeInTheDocument();
    expect(within(picker).queryByRole('button', { name: /Alice/ })).not.toBeInTheDocument();
    expect(within(picker).queryByRole('button', { name: /Anna/ })).not.toBeInTheDocument();
    await user.click(within(picker).getByRole('button', { name: /Bob/ }));

    expect(screen.getByText(/Anna contre Bob/)).toBeInTheDocument();
    // Pas de refus, pas de joker pendant un duel.
    expect(screen.queryByRole('button', { name: 'Je refuse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Passe/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Bob gagne/ }));
    expect(playerScores(g()).b1).toBe(3);
    expect(teamScores(g())).toEqual({ T1: 0, T2: 3 });
    expect(g().log[0]).toMatchObject({ outcome: 'duel', duelOpponentId: 'a2', turnOwnerId: 'a1' });
    expect(await screen.findByRole('button', { name: 'Lancer la roulette' })).toBeInTheDocument();
  });

  it('peut être annulé et rend la main à la carte normale', async () => {
    const user = userEvent.setup();
    await show(teamGame({ duel: true }, card({ duel: { a: 'a1', b: 'b1' } })));
    await user.click(screen.getByRole('button', { name: 'Annuler le duel' }));
    expect(g().pending?.duel).toBeUndefined();
    expect(await screen.findByRole('button', { name: 'Je refuse' })).toBeInTheDocument();
  });

  it('n’est plus proposé une fois utilisé dans le tour de table', async () => {
    const game = teamGame({ duel: true }, card());
    game.log = [
      {
        id: 'd',
        turnOwnerId: 'a1',
        playerId: 'b1',
        duelOpponentId: 'a2',
        themeId: 'theme-1',
        cardNumber: 1,
        outcome: 'duel',
        pointsDelta: 3,
        nextPlayerId: 'a1',
        timestamp: 1,
      },
    ];
    await show(game);
    expect(screen.queryByRole('button', { name: /Lancer un duel/ })).not.toBeInTheDocument();
  });
});

describe('joker partagé', () => {
  it('affiche la réserve d’équipe sur la carte et dans le tableau des scores', async () => {
    const user = userEvent.setup();
    await show(teamGame({ sharedJokers: true }, card()));
    expect(screen.getByRole('heading', { name: /Jokers · Jokers d’équipe/ })).toBeInTheDocument();
    // 2 membres × 1 joker de départ = 2 de chaque type.
    expect(screen.getByRole('button', { name: /Passe\s*×2/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Scores' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getAllByText(/Jokers d’équipe : Passe 2 · Double 2 · Transfert 2/),
    ).toHaveLength(2);
  });
});
