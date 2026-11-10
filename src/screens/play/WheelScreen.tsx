import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../components/ui.module.css';
import { ThemeWheel } from '../../components/ThemeWheel';
import { endReasons, type EndReason } from '../../engine/end';
import { exhaustedThemes, hydrationDue } from '../../engine/game';
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
  const navigate = useNavigate();
  const finishGame = useGameStore((s) => s.finishGame);
  const dismissEnd = useGameStore((s) => s.dismissEnd);
  const [hydrationSeen, setHydrationSeen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const finishing = useRef(false);

  // L'heure sert à détecter la fin « durée écoulée » ; mise à jour toutes les 15 s.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const onDone = useCallback(() => void reveal(), [reveal]);

  const themes = game.themeIds
    .map((id) => content.themes.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const pending = game.pending;
  const targetId = pending?.stage === 'theme' && !pending.revealed ? pending.themeId : null;
  const noneLeft = availableThemes(game).length === 0;
  const reasons = endReasons(game, now).filter(
    (r): r is Exclude<EndReason, 'exhausted'> =>
      r !== 'exhausted' && !game.endDismissed?.includes(r),
  );

  // Toutes les cartes jouées : la partie se termine d'elle-même (écran de fin).
  useEffect(() => {
    if (!noneLeft || game.pending || finishing.current) return;
    finishing.current = true;
    void finishGame().then((id) => id && navigate(`/end/${id}`, { replace: true }));
  }, [noneLeft, game.pending, finishGame, navigate]);

  const finishNow = async () => {
    const id = await finishGame();
    if (id) navigate(`/end/${id}`, { replace: true });
  };

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      {reasons.length > 0 && !game.pending && (
        <section className={styles.notice} role="alert" style={{ flexWrap: 'wrap' }}>
          <span aria-hidden="true">🏁</span>
          <span className={styles.grow}>
            {fr.end.reached} : {reasons.map((r) => fr.end.reasons[r]).join(', ')}
          </span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void finishNow()}
          >
            {fr.end.finishAction}
          </button>
          <button type="button" className={styles.btn} onClick={() => void dismissEnd(reasons)}>
            {fr.end.continueAction}
          </button>
        </section>
      )}
      {hydrationDue(game) && !hydrationSeen && !game.pending && (
        <p className={styles.notice} role="status">
          <span aria-hidden="true">💧</span>
          <span className={styles.grow}>{fr.play.hydration}</span>
          <button type="button" className={styles.btn} onClick={() => setHydrationSeen(true)}>
            {fr.play.ok}
          </button>
        </p>
      )}
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
