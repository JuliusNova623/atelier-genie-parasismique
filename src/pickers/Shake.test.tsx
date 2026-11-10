import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { Shake } from './Shake';

function shakeEvent(x: number) {
  const e = new Event('devicemotion') as Event & {
    accelerationIncludingGravity: { x: number; y: number; z: number };
  };
  e.accelerationIncludingGravity = { x, y: 0, z: 0 };
  window.dispatchEvent(e);
}

describe('Shake', () => {
  beforeEach(() => {
    (window as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent = class {};
  });
  afterEach(() => {
    delete (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
  });

  const props = { max: 20, excluded: [], target: null, reduced: true, onDone: vi.fn() };

  it('déclenche le tirage une seule fois après plusieurs secousses franches', () => {
    const onTrigger = vi.fn();
    render(<Shake {...props} onTrigger={onTrigger} />);
    act(() => {
      for (const v of [0, 30, 0, 30, 0, 30, 0, 30]) shakeEvent(v);
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('ignore un simple mouvement doux', () => {
    const onTrigger = vi.fn();
    render(<Shake {...props} onTrigger={onTrigger} />);
    act(() => {
      for (const v of [9.8, 10.5, 9.9, 10.8, 9.7]) shakeEvent(v);
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('propose toujours un bouton de repli', () => {
    const onTrigger = vi.fn();
    render(<Shake {...props} onTrigger={onTrigger} />);
    act(() => screen.getByRole('button', { name: 'Lancer sans secouer' }).click());
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('sans capteur, le bouton « Lancer » reste utilisable', () => {
    delete (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
    const onTrigger = vi.fn();
    render(<Shake {...props} onTrigger={onTrigger} />);
    expect(screen.getByRole('button', { name: 'Lancer sans secouer' })).toHaveTextContent('Lancer');
    act(() => screen.getByRole('button', { name: 'Lancer sans secouer' }).click());
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});
