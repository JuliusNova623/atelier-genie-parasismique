import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** Événements de jeu qui déclenchent un son et/ou une vibration. */
export type Cue =
  | 'spin'
  | 'reveal'
  | 'success'
  | 'drink'
  | 'refuse'
  | 'pass'
  | 'duel'
  | 'alarm'
  | 'fanfare'
  | 'undo';

interface Note {
  /** Fréquence (Hz). */
  f: number;
  /** Début (s) après le déclenchement. */
  at: number;
  /** Durée (s). */
  d: number;
  type?: OscillatorType;
  gain?: number;
}

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Sons synthétisés (aucun fichier, aucune dépendance réseau) + vibration associée. */
export const CUES: Record<Cue, { notes: Note[]; haptic: HapticKind }> = {
  spin: {
    notes: [
      { f: 440, at: 0, d: 0.05, type: 'square', gain: 0.5 },
      { f: 520, at: 0.08, d: 0.05, type: 'square', gain: 0.5 },
    ],
    haptic: 'light',
  },
  reveal: {
    notes: [
      { f: 660, at: 0, d: 0.12 },
      { f: 880, at: 0.1, d: 0.2 },
    ],
    haptic: 'heavy',
  },
  success: {
    notes: [
      { f: 523, at: 0, d: 0.12 },
      { f: 659, at: 0.1, d: 0.12 },
      { f: 784, at: 0.2, d: 0.25 },
    ],
    haptic: 'success',
  },
  drink: {
    notes: [
      { f: 300, at: 0, d: 0.1, type: 'triangle' },
      { f: 400, at: 0.09, d: 0.16, type: 'triangle' },
    ],
    haptic: 'medium',
  },
  refuse: {
    notes: [
      { f: 330, at: 0, d: 0.15, type: 'sawtooth', gain: 0.5 },
      { f: 220, at: 0.14, d: 0.25, type: 'sawtooth', gain: 0.5 },
    ],
    haptic: 'warning',
  },
  pass: {
    notes: [{ f: 600, at: 0, d: 0.12, type: 'triangle' }],
    haptic: 'light',
  },
  duel: {
    notes: [
      { f: 392, at: 0, d: 0.1, type: 'square', gain: 0.5 },
      { f: 392, at: 0.14, d: 0.1, type: 'square', gain: 0.5 },
      { f: 523, at: 0.28, d: 0.25, type: 'square', gain: 0.5 },
    ],
    haptic: 'heavy',
  },
  alarm: {
    notes: [0, 0.25, 0.5].map((at) => ({
      f: 880,
      at,
      d: 0.15,
      type: 'square' as const,
      gain: 0.6,
    })),
    haptic: 'error',
  },
  fanfare: {
    notes: [
      { f: 523, at: 0, d: 0.15 },
      { f: 659, at: 0.15, d: 0.15 },
      { f: 784, at: 0.3, d: 0.15 },
      { f: 1047, at: 0.45, d: 0.45 },
    ],
    haptic: 'success',
  },
  undo: {
    notes: [
      { f: 500, at: 0, d: 0.08, type: 'triangle' },
      { f: 380, at: 0.08, d: 0.12, type: 'triangle' },
    ],
    haptic: 'light',
  },
};

export interface FeedbackPrefs {
  sound: boolean;
  haptics: boolean;
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function playNotes(notes: Note[]): void {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.f;
    const peak = 0.12 * (n.gain ?? 1);
    // Enveloppe courte : évite les « clics » au début et à la fin de chaque note.
    g.gain.setValueAtTime(0.0001, t0 + n.at);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.d);
    osc.connect(g).connect(c.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.d + 0.02);
  }
}

const VIBRATE_MS: Record<HapticKind, number | number[]> = {
  light: 15,
  medium: 30,
  heavy: 50,
  success: [20, 40, 20],
  warning: [40, 40, 40],
  error: [80, 40, 80],
};

async function vibrate(kind: HapticKind): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'warning') await Haptics.notification({ type: NotificationType.Warning });
      else if (kind === 'error') await Haptics.notification({ type: NotificationType.Error });
      else {
        const style =
          kind === 'light'
            ? ImpactStyle.Light
            : kind === 'medium'
              ? ImpactStyle.Medium
              : ImpactStyle.Heavy;
        await Haptics.impact({ style });
      }
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(VIBRATE_MS[kind]);
    }
  } catch {
    // Le retour haptique est un confort : jamais bloquant.
  }
}

/** Joue le son et/ou la vibration d'un événement, selon les réglages (activables séparément). */
export function playCue(cue: Cue, prefs: FeedbackPrefs): void {
  const def = CUES[cue];
  if (prefs.sound) {
    try {
      playNotes(def.notes);
    } catch {
      // WebAudio indisponible ou bloqué : on continue sans son.
    }
  }
  if (prefs.haptics) void vibrate(def.haptic);
}
