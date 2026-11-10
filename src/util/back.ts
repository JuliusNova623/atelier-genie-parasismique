/**
 * Bouton retour Android : jamais de sortie brutale pendant une partie.
 * Les composants « fermables » (bottom sheet…) enregistrent un gestionnaire prioritaire.
 */
type Handler = () => boolean;
const stack: Handler[] = [];

export function pushBackHandler(handler: Handler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Donne la main au gestionnaire le plus récent ; renvoie true si l'un d'eux a consommé l'événement. */
export function runBackHandlers(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]()) return true;
  return false;
}

export type BackAction = 'go-home' | 'confirm-quit' | 'exit';

/**
 * Que faire d'un appui sur « retour » ?
 * - sur l'accueil ou en pleine partie : jamais de sortie directe si une partie est en cours
 *   (confirmation « Mettre la partie en pause et quitter ? », la partie est déjà sauvegardée) ;
 * - ailleurs : retour logique à l'accueil.
 */
export function resolveBack(pathname: string, gameRunning: boolean): BackAction {
  if (pathname === '/') return gameRunning ? 'confirm-quit' : 'exit';
  if (pathname === '/play') return gameRunning ? 'confirm-quit' : 'go-home';
  return 'go-home';
}
