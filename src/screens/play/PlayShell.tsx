import type { ReactNode } from 'react';
import { fr } from '../../i18n/fr';
import type { Game } from '../../engine/types';
import { useIsTv } from '../../util/display';
import { toggleFullscreen } from '../../util/fullscreen';
import { LiveScores } from './LiveScores';
import styles from './play.module.css';
import type { PlayScreen } from './useHotkeys';

const HINTS: Record<PlayScreen, [string, string][]> = {
  wheel: [['Espace', fr.play.keys.wheel]],
  theme: [['Espace', fr.play.keys.theme]],
  card: [
    ['Espace', fr.play.keys.cardDo],
    ['B', fr.play.keys.cardRefuse],
    ['P', fr.play.keys.cardPass],
  ],
  flow: [['Espace', 'Valider']],
  drink: [['Espace', `${fr.play.keys.drinkSpin} / ${fr.play.keys.drinkDrank}`]],
};

/**
 * Habille l'écran de jeu. Sur téléphone : transparent. En mode écran (TV) : la scène à gauche,
 * les scores en direct et l'aide des raccourcis à droite.
 */
export function PlayShell({
  game,
  screen,
  children,
}: {
  game: Game;
  screen: PlayScreen;
  children: ReactNode;
}) {
  const tv = useIsTv();
  return (
    <div className={styles.shell} data-screen={screen}>
      <div className={styles.main}>{children}</div>
      {tv && (
        <aside className={styles.side}>
          <LiveScores game={game} />
          <div className={styles.keys} aria-label={fr.play.keys.title}>
            <h2>{fr.play.keys.title}</h2>
            {HINTS[screen].map(([k, label]) => (
              <div key={k}>
                <kbd>{k}</kbd>
                <span>{label}</span>
              </div>
            ))}
            <div>
              <kbd>F</kbd>
              <span>{fr.play.keys.fullscreen}</span>
            </div>
          </div>
          <button type="button" className={styles.fsBtn} onClick={() => void toggleFullscreen()}>
            ⛶ {fr.play.keys.fullscreen}
          </button>
        </aside>
      )}
    </div>
  );
}
