import { ANNOUNCER_ID } from '../util/announce';

/** Région aria-live globale, invisible : lit à voix haute le résultat des tirages. */
export function Announcer() {
  return <div id={ANNOUNCER_ID} className="sr-only" role="status" aria-live="polite" />;
}
