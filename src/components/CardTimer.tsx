import { useEffect, useState } from 'react';
import { fr } from '../i18n/fr';
import { useSettings } from '../store/settings';
import { playCue } from '../util/feedback';
import styles from './ui.module.css';

/** Chronomètre optionnel d'une action : décompte en secondes, démarrage manuel. */
export function CardTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Alarme (son + vibration) quand le temps est écoulé.
  useEffect(() => {
    if (left !== 0) return;
    const { sound, haptics } = useSettings.getState();
    playCue('alarm', { sound, haptics });
  }, [left]);

  const over = left === 0;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div
      className={styles.row}
      style={{ justifyContent: 'center' }}
      role="group"
      aria-label={fr.play.timer.label}
    >
      <output
        aria-live="off"
        style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums', minWidth: 90 }}
      >
        {mm}:{ss}
      </output>
      {over ? (
        <strong role="status">{fr.play.timer.over}</strong>
      ) : (
        <button type="button" className={styles.btn} onClick={() => setRunning((r) => !r)}>
          {running ? fr.play.timer.pause : fr.play.timer.start}
        </button>
      )}
      <button
        type="button"
        className={styles.btn}
        onClick={() => {
          setRunning(false);
          setLeft(seconds);
        }}
      >
        {fr.play.timer.reset}
      </button>
    </div>
  );
}
