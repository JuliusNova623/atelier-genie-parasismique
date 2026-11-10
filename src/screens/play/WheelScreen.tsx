import { useReducedMotion } from 'framer-motion';
import { useCallback } from 'react';
import styles from '../../components/ui.module.css';
import { ThemeWheel } from '../../components/ThemeWheel';
import { exhaustedThemes } from '../../engine/game';
import { availableThemes } from '../../engine/turn';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { useContent } from '../../store/content';
import { useGameStore } from '../../store/game';
import { PlayerBanner } from './PlayerBanner';

export function WheelScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const spinTheme = useGameStore((s) => s.spinTheme);
  const reveal = useGameStore((s) => s.reveal);
  const reduced = useReducedMotion() ?? false;
  const onDone = useCallback(() => void reveal(), [reveal]);

  const themes = game.themeIds
    .map((id) => content.themes.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const pending = game.pending;
  const targetId = pending?.stage === 'theme' && !pending.revealed ? pending.themeId : null;
  const noneLeft = availableThemes(game).length === 0;

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      {noneLeft ? (
        <section className={styles.section} role="status">
          <h2>{fr.play.allDone}</h2>
        </section>
      ) : (
        <>
          <ThemeWheel
            themes={themes}
            exhausted={exhaustedThemes(game)}
            targetId={targetId}
            onTrigger={() => void spinTheme()}
            onDone={onDone}
            reduced={reduced}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ minHeight: 56 }}
            disabled={targetId !== null}
            onClick={() => void spinTheme()}
          >
            {fr.play.spin}
          </button>
          <p className={styles.hint} style={{ textAlign: 'center' }}>
            {fr.play.spinHint}
          </p>
        </>
      )}
    </main>
  );
}
