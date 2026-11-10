import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { randomInt } from '../engine/rng';
import { useOnceTrigger } from './anim';
import styles from './pickers.module.css';
import type { NumberPickerProps } from './types';

const ROLL_MS = 1800;

/** Dé à 20 faces animé (SVG + rotation). Tap ou swipe pour lancer. */
export function Dice({ max, target, onTrigger, onDone, reduced }: NumberPickerProps) {
  const [shown, setShown] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const trigger = useOnceTrigger(onTrigger, target);
  const rolling = target !== null && !settled;

  useEffect(() => {
    if (target === null) return;
    const roll = reduced ? 150 : ROLL_MS;
    const flicker = reduced ? undefined : setInterval(() => setShown(1 + randomInt(max)), 80);
    const end = setTimeout(() => {
      if (flicker) clearInterval(flicker);
      setShown(target);
      setSettled(true);
    }, roll);
    const done = setTimeout(() => onDone(target), roll + (reduced ? 200 : 700));
    return () => {
      if (flicker) clearInterval(flicker);
      clearTimeout(end);
      clearTimeout(done);
    };
  }, [target, max, reduced, onDone]);

  return (
    <div className={styles.box}>
      <motion.button
        type="button"
        className={styles.dieButton}
        aria-label={rolling ? 'Le dé roule…' : 'Lancer le dé à 20 faces'}
        disabled={target !== null}
        onClick={trigger}
        onPanEnd={(_, info) => {
          if (Math.hypot(info.offset.x, info.offset.y) > 40) trigger();
        }}
        animate={
          rolling && !reduced
            ? { rotate: [0, 360, 720], scale: [1, 1.18, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: ROLL_MS / 1000, ease: 'easeOut' }}
      >
        <svg viewBox="0 0 120 120" className={styles.die} aria-hidden="true">
          <polygon points="60,4 110,32 110,88 60,116 10,88 10,32" className={styles.dieShape} />
          <polygon points="60,22 96,78 24,78" className={styles.dieInner} />
          <path
            d="M60 4 L60 22 M110 32 L96 78 M10 32 L24 78 M60 116 L60 78"
            className={styles.dieEdge}
          />
          <text x="60" y="68" textAnchor="middle" className={styles.dieText}>
            {shown ?? max}
          </text>
        </svg>
      </motion.button>
      <p className={styles.hint}>{target === null ? 'Touche ou fais glisser le dé' : ' '}</p>
    </div>
  );
}
