/** Bascule le plein écran (touche F) : indispensable pour projeter proprement sur une TV. */
export async function toggleFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  } catch {
    // Refusé par le navigateur (pas de geste utilisateur, WebView…) : sans effet.
  }
}

export const isFullscreen = (): boolean =>
  typeof document !== 'undefined' && !!document.fullscreenElement;
