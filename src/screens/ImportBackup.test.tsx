import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { BackupSection } from '../components/BackupSection';
import { builtInContent } from '../content';
import { repo } from '../db/repo';
import { createDeck } from '../engine/deck';
import { createGame, recordTurn } from '../engine/game';
import { endGame } from '../engine/results';
import { DEFAULT_RULES, type Player } from '../engine/types';
import { useContent } from '../store/content';
import { useGameStore } from '../store/game';
import { saveTextFile } from '../util/files';
import { ImportScreen } from './ImportScreen';

vi.mock('../util/files', async (orig) => ({
  ...(await orig<typeof import('../util/files')>()),
  saveTextFile: vi.fn(async () => undefined),
}));

const mk = (id: string): Player => ({
  id,
  name: id,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

const renderImport = () =>
  render(
    <MemoryRouter>
      <ImportScreen />
    </MemoryRouter>,
  );

const paste = (value: string) =>
  fireEvent.change(screen.getByLabelText('Coller le JSON'), { target: { value } });

const threeThemes = () => ({ ...builtInContent, themes: builtInContent.themes.slice(0, 3) });

beforeEach(async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await repo.clearContentOverride();
  await useContent.getState().load();
  await act(async () => {
    await useGameStore.getState().clear();
  });
});
afterEach(() => vi.restoreAllMocks());

describe('Importer des cartes', () => {
  it('signale un JSON invalide', async () => {
    const user = userEvent.setup();
    renderImport();
    paste('{pas du json');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pas du JSON valide');
  });

  it('liste des erreurs lisibles : quel thème, quelle carte, quel champ', async () => {
    const user = userEvent.setup();
    renderImport();
    const bad = structuredClone(builtInContent);
    (bad.themes[1].cards[3] as { type: string }).type = 'devinette';
    bad.themes[0].cards.pop();
    paste(JSON.stringify(bad));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    const alerts = await screen.findAllByRole('alert');
    const text = alerts.map((a) => a.textContent).join(' ');
    expect(text).toContain('Thème n°2');
    expect(text).toContain('carte 4');
    expect(text).toContain('« type »');
    expect(
      screen.queryByRole('button', { name: 'Enregistrer ce contenu' }),
    ).not.toBeInTheDocument();
  });

  it('prévisualise, avertit (3 thèmes), enregistre puis permet de revenir au contenu par défaut', async () => {
    const user = userEvent.setup();
    renderImport();
    paste(JSON.stringify(threeThemes()));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(await screen.findByText(/3 thèmes trouvés \(10 attendus\)/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aperçu' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer ce contenu' }));
    expect(await screen.findByText(/Contenu enregistré/)).toBeInTheDocument();
    expect((await repo.getContent()).themes).toHaveLength(3);
    expect(useContent.getState().content.themes).toHaveLength(3);
    expect(screen.getByText(/Contenu importé · 3 thèmes · 60 cartes/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revenir au contenu par défaut' }));
    expect(await screen.findByText('Contenu par défaut rétabli.')).toBeInTheDocument();
    expect((await repo.getContent()).themes).toHaveLength(10);
    expect(screen.getByText(/Contenu intégré · 10 thèmes · 200 cartes/)).toBeInTheDocument();
  });

  it('charge un fichier .json', async () => {
    const user = userEvent.setup();
    renderImport();
    const file = new File([JSON.stringify(threeThemes())], 'cartes.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText('Charger un fichier .json'), file);
    expect(await screen.findByRole('heading', { name: 'Aperçu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer ce contenu' })).toBeEnabled();
  });

  it('bloque l’enregistrement tant qu’une partie est en cours', async () => {
    const user = userEvent.setup();
    await act(async () => {
      await useGameStore.getState().setGame(
        createGame({
          now: 0,
          mode: 'solo',
          players: [mk('a'), mk('b')],
          rules: DEFAULT_RULES,
          themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
        }),
      );
    });
    renderImport();
    paste(JSON.stringify(builtInContent));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(
      await screen.findByText(/terminez-la avant de remplacer les cartes/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer ce contenu' })).toBeDisabled();
  });

  it('exporte le contenu actuel', async () => {
    const user = userEvent.setup();
    renderImport();
    await user.click(screen.getByRole('button', { name: 'Exporter le contenu actuel' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [name, text] = vi.mocked(saveTextFile).mock.calls[0];
    expect(name).toMatch(/^cartes-\d{8}-\d{4}\.json$/);
    expect(JSON.parse(text).themes).toHaveLength(10);
  });
});

describe('sauvegarde des données', () => {
  const backupFile = async () => {
    await repo.archiveGame(
      endGame(
        recordTurn(
          createGame({
            id: 'from-backup',
            now: 1,
            mode: 'solo',
            players: [mk('a'), mk('b')],
            rules: DEFAULT_RULES,
            themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
          }),
          { themeId: 'theme-1', cardNumber: 1, outcome: 'done' },
          2,
        ),
        3,
      ),
      3,
    );
    const { exportBackup } = await import('../db/backup');
    const data = JSON.stringify(await exportBackup());
    await repo.deleteHistoryGame('from-backup');
    return new File([data], 'sauvegarde.json', { type: 'application/json' });
  };

  it('exporte toutes les données', async () => {
    const user = userEvent.setup();
    render(<BackupSection />);
    await user.click(screen.getByRole('button', { name: 'Exporter mes données' }));
    expect(saveTextFile).toHaveBeenCalled();
    const [name, text] = vi.mocked(saveTextFile).mock.calls.at(-1)!;
    expect(name).toMatch(/^sauvegarde-/);
    expect(JSON.parse(text)).toMatchObject({ app: 'roulette-soiree', version: 1 });
  });

  it('restaure une sauvegarde après confirmation', async () => {
    const user = userEvent.setup();
    const file = await backupFile();
    expect(await repo.getHistoryGame('from-backup')).toBeUndefined();
    render(<BackupSection />);
    await user.upload(screen.getByTestId('backup-file'), file);
    expect(await screen.findByText('Données restaurées.')).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('irréversible'));
    expect(await repo.getHistoryGame('from-backup')).toBeDefined();
  });

  it('refuse un fichier invalide sans rien modifier', async () => {
    const user = userEvent.setup();
    await repo.archiveGame(
      endGame(
        createGame({
          id: 'keep',
          now: 1,
          mode: 'solo',
          players: [mk('a'), mk('b')],
          rules: DEFAULT_RULES,
          themes: [{ id: 'theme-1', cardNumbers: createDeck(20) }],
        }),
        2,
      ),
      2,
    );
    render(<BackupSection />);
    await user.upload(
      screen.getByTestId('backup-file'),
      new File(['{"foo":1}'], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Sauvegarde invalide');
    expect(await repo.getHistoryGame('keep')).toBeDefined();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('ne modifie rien si l’utilisateur annule la confirmation', async () => {
    const user = userEvent.setup();
    const file = await backupFile();
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<BackupSection />);
    await user.upload(screen.getByTestId('backup-file'), file);
    await screen.findByRole('button', { name: 'Importer des données' });
    expect(screen.queryByText('Données restaurées.')).not.toBeInTheDocument();
    expect(await repo.getHistoryGame('from-backup')).toBeUndefined();
  });
});
