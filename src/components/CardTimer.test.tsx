import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { CardTimer } from './CardTimer';

describe('CardTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('décompte, se met en pause, se réinitialise et signale la fin', () => {
    render(<CardTimer seconds={3} />);
    expect(screen.getByText('00:03')).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: 'Démarrer le chronomètre' }).click());
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByText('00:02')).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: 'Pause' }).click());
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByText('00:02')).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: 'Réinitialiser' }).click());
    expect(screen.getByText('00:03')).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: 'Démarrer le chronomètre' }).click());
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('Temps écoulé !')).toBeInTheDocument();
  });
});
