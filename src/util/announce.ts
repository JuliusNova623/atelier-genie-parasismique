/**
 * Annonces pour lecteur d'écran (région aria-live globale). Utilisé pour le résultat des tirages,
 * dont l'animation est purement visuelle.
 */
export const ANNOUNCER_ID = 'sr-announcer';

export function announce(text: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(ANNOUNCER_ID);
  if (!el) return;
  // On vide d'abord pour que deux annonces identiques successives soient bien relues.
  el.textContent = '';
  setTimeout(() => {
    el.textContent = text;
  }, 50);
}
