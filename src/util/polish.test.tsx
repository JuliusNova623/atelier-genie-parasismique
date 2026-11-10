import 'fake-indexeddb/auto';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { Announcer } from '../components/Announcer';
import { CardTimer } from '../components/CardTimer';
import { builtInContent } from '../content';
import { createDeck } from '../engine/deck';
import { createGame } from '../engine/game';
import { drawCardNumber, drawDrinkNumber, drawTheme, refuseCard } from '../engine/turn';
import { DEFAULT_RULES, type Game, type Player } from '../engine/types';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { announce } from './announce';
import { pushBackHandler, resolveBack, runBackHandlers } from './back';
import { CUES, playCue, type Cue } from './feedback';
import { STATUS_BAR } from './native';

const vibrate = vi.fn();

class FakeOsc {
  type = 'sine';
  frequency = { value: 0 };
  connect = vi.fn(() => ({ connect: vi.fn() }));
  start = vi.fn();
  stop = vi.fn();
}
const created: FakeOsc[] = [];
class FakeAudio {
  currentTime = 0;
  state = 'running';
  destination = {};
  resume = vi.fn();
  createOscillator() {
    const o = new FakeOsc();
    created.push(o);
    return o;
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(() => ({ connect: vi.fn() })),
    };
  }
}

beforeEach(() => {
  created.length = 0;
  vibrate.mockClear();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudio;
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
});
afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  vi.useRealTimers();
});

describe('retours sonores et haptiques', () => {
  it('définit un son et une vibration pour chaque événement', () => {
    for (const [name, def] of Object.entries(CUES)) {
      expect(def.notes.length, name).toBeGreaterThan(0);
      for (const n of def.notes) {
        expect(n.f).toBeGreaterThan(100);
        expect(n.d).toBeGreaterThan(0);
      }
    }
  });

  it('joue le son et vibre quand les deux réglages sont activés', () => {
    playCue('success', { sound: true, haptics: true });
    expect(created).toHaveLength(CUES.success.notes.length);
    expect(created[0].start).toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('respecte les réglages : sons désactivés = silence, vibrations désactivées = pas de vibration', () => {
    playCue('reveal', { sound: false, haptics: true });
    expect(created).toHaveLength(0);
    expect(vibrate).toHaveBeenCalledTimes(1);

    vibrate.mockClear();
    playCue('reveal', { sound: true, haptics: false });
    expect(created.length).toBeGreaterThan(0);
    expect(vibrate).not.toHaveBeenCalled();

    created.length = 0;
    playCue('fanfare', { sound: false, haptics: false });
    expect(created).toHaveLength(0);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('ne plante jamais sans WebAudio ni vibration', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    const cues = Object.keys(CUES) as Cue[];
    for (const c of cues) expect(() => playCue(c, { sound: true, haptics: true })).not.toThrow();
  });
});

describe('bouton retour', () => {
  it('ne quitte jamais brutalement pendant une partie', () => {
    expect(resolveBack('/', true)).toBe('confirm-quit');
    expect(resolveBack('/play', true)).toBe('confirm-quit');
    expect(resolveBack('/', false)).toBe('exit');
  });

  it('revient à l’accueil depuis les autres écrans', () => {
    for (const p of ['/settings', '/new', '/history', '/import', '/about', '/end/abc']) {
      expect(resolveBack(p, true)).toBe('go-home');
      expect(resolveBack(p, false)).toBe('go-home');
    }
    expect(resolveBack('/play', false)).toBe('go-home');
  });

  it('donne la priorité au gestionnaire le plus récent, et le retire à la fermeture', () => {
    const calls: string[] = [];
    const off1 = pushBackHandler(() => (calls.push('sheet'), true));
    const off2 = pushBackHandler(() => (calls.push('modal'), true));
    expect(runBackHandlers()).toBe(true);
    expect(calls).toEqual(['modal']);
    off2();
    expect(runBackHandlers()).toBe(true);
    expect(calls).toEqual(['modal', 'sheet']);
    off1();
    expect(runBackHandlers()).toBe(false);
  });

  it('un gestionnaire qui ne consomme pas laisse passer au suivant', () => {
    const seen: string[] = [];
    const off1 = pushBackHandler(() => (seen.push('a'), true));
    const off2 = pushBackHandler(() => (seen.push('b'), false));
    expect(runBackHandlers()).toBe(true);
    expect(seen).toEqual(['b', 'a']);
    off1();
    off2();
  });
});

describe('barre d’état', () => {
  it('définit une couleur par thème, texte sombre seulement sur fond clair', () => {
    expect(Object.keys(STATUS_BAR).sort()).toEqual(['arcade', 'neon', 'pastel', 'sober']);
    expect(STATUS_BAR.neon.color).toBe('#0b0614');
    expect(STATUS_BAR.pastel.light).toBe(true);
    expect(STATUS_BAR.neon.light).toBe(false);
  });
});

describe('annonces lecteur d’écran', () => {
  it('écrit dans la région aria-live', () => {
    vi.useFakeTimers();
    render(<Announcer />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    act(() => {
      announce('Carte numéro 7 tirée');
      vi.advanceTimersByTime(60);
    });
    expect(region).toHaveTextContent('Carte numéro 7 tirée');
  });

  it('ne plante pas si la région est absente', () => {
    expect(() => announce('x')).not.toThrow();
  });
});

const mk = (id: string, name: string): Player => ({
  id,
  name,
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

function base(): Game {
  return createGame({
    now: 0,
    mode: 'solo',
    players: [mk('a', 'Alice'), mk('b', 'Bob')],
    rules: DEFAULT_RULES,
    themes: builtInContent.themes.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
}

describe('le store annonce les tirages et joue les sons', () => {
  it('annonce le thème, la carte et la boisson une fois révélés', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Announcer />);
    const region = screen.getByRole('status');
    await act(async () => {
      await useSettings.getState().update({ sound: false, haptics: false });
    });

    let g = drawTheme(base());
    g = { ...g, pending: { ...g.pending!, themeId: 'theme-4' } };
    await act(async () => {
      await useGameStore.getState().setGame(g);
      await useGameStore.getState().reveal();
      vi.advanceTimersByTime(80);
    });
    expect(region).toHaveTextContent('Thème tiré : Thème 4');

    g = drawCardNumber(useGameStore.getState().game!);
    g = { ...g, pending: { ...g.pending!, cardNumber: 12 } };
    await act(async () => {
      await useGameStore.getState().setGame(g);
      await useGameStore.getState().reveal();
      vi.advanceTimersByTime(80);
    });
    expect(region).toHaveTextContent('Carte numéro 12 tirée');

    let d = refuseCard(useGameStore.getState().game!);
    d = drawDrinkNumber(d);
    d = { ...d, pending: { ...d.pending!, drinkNumber: 5 } };
    await act(async () => {
      await useGameStore.getState().setGame(d);
      await useGameStore.getState().reveal();
      vi.advanceTimersByTime(80);
    });
    expect(region).toHaveTextContent('Boisson numéro 5 : Boisson n°5');
  });

  it('joue un son à la validation d’une carte si les sons sont activés, pas sinon', async () => {
    await act(async () => {
      await useSettings.getState().update({ sound: true, haptics: false });
    });
    const g: Game = {
      ...base(),
      pending: { stage: 'card', themeId: 'theme-1', cardNumber: 1, revealed: true },
    };
    await act(async () => {
      await useGameStore.getState().setGame(g);
      await useGameStore.getState().completeCard();
    });
    expect(created.length).toBe(CUES.success.notes.length);

    created.length = 0;
    await act(async () => {
      await useSettings.getState().update({ sound: false });
      await useGameStore.getState().setGame({ ...g, log: [], pending: g.pending });
      await useGameStore.getState().completeCard();
    });
    expect(created).toHaveLength(0);
  });
});

describe('chronomètre', () => {
  it('déclenche l’alarme (son) quand le temps est écoulé', async () => {
    // Les réglages passent par IndexedDB : on les écrit AVANT d'activer les faux timers.
    await act(async () => {
      await useSettings.getState().update({ sound: true, haptics: true });
    });
    vi.useFakeTimers();
    created.length = 0;
    render(
      <MemoryRouter>
        <CardTimer seconds={2} />
      </MemoryRouter>,
    );
    expect(created).toHaveLength(0);
    act(() => screen.getByRole('button', { name: 'Démarrer le chronomètre' }).click());
    act(() => void vi.advanceTimersByTime(2000));
    expect(created.length).toBe(CUES.alarm.notes.length);
    expect(vibrate).toHaveBeenCalled();
  });
});
