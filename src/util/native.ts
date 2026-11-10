import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';

export type ThemeId = 'neon' | 'arcade' | 'sober' | 'pastel';

/** Couleur de barre d'état par thème visuel (et style du texte : clair sur fond sombre). */
export const STATUS_BAR: Record<ThemeId, { color: string; light: boolean }> = {
  neon: { color: '#0b0614', light: false },
  arcade: { color: '#000020', light: false },
  sober: { color: '#16181d', light: false },
  pastel: { color: '#fdf6ff', light: true },
};

export async function applyStatusBar(theme: ThemeId): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { color, light } = STATUS_BAR[theme];
  try {
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark });
  } catch {
    // Non supporté sur cette plateforme : sans effet.
  }
}

export async function hideSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide();
  } catch {
    // ignoré
  }
}

type WakeSentinel = { release: () => Promise<void> };
let sentinel: WakeSentinel | null = null;

/**
 * Garde l'écran allumé. Natif : plugin keep-awake. Navigateur : Screen Wake Lock API si disponible.
 * Tout échec est silencieux (confort, jamais bloquant).
 */
export async function setKeepAwake(on: boolean): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (on) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
      return;
    }
    const wl = (
      navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeSentinel> } }
    ).wakeLock;
    if (!wl) return;
    if (on && !sentinel) sentinel = await wl.request('screen');
    if (!on && sentinel) {
      await sentinel.release();
      sentinel = null;
    }
  } catch {
    sentinel = null;
  }
}
