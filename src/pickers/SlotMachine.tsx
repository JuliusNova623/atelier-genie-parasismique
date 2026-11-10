import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { randomInt } from '../engine/rng';
import { slotDelay, slotSequence, useOnceTrigger } from './anim';
import styles from './pickers.module.css';
import type { NumberPickerProps } from './types';

/** Machine à sous : les chiffres défilent et ralentissent jusqu'au résultat déjà tiré. */
export function SlotMachine({ max, target, onTrigger, onDone, reduced }: NumberPickerProps) {
  const [shown, setShown] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const trigger = useOnceTrigger(onTrigger, target);

  useEffect(() => {
    if (target === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      setShown(target);
      setSettled(true);
      timer = setTimeout(() => onDone(target), reduced ? 200 : 700);
    };
    if (reduced) {
      timer = setTimeout(finish, 150);
    } else {
      const seq = slotSequence(max, target, 1 + randomInt(max));
      const step = (i: number) => {
        if (cancelled) return;
        setShown(seq[i]);
        if (i === seq.length - 1) {
          setSettled(true);
          timer = setTimeout(() => onDone(target), 700);
        } else {
          timer = setTimeout(() => step(i + 1), slotDelay(i, seq.length));
        }
      };
      step(0);
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [target, max, reduced, onDone]);

  return (
    <div className={styles.box}>
      <button
        type="button"
        className={styles.slotButton}
        aria-label="Lancer la machine à sous"
        disabled={target !== null}
        onClick={trigger}
      >
        <span className={styles.slotWindow}>
          <motion.span
            key={shown ?? 'idle'}
            className={`${styles.slotDigits} ${settled ? styles.slotSettled : ''}`}
            initial={reduced ? false : { y: -26, opacity: 0.2 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.08 }}
          >
            {shown ?? '?'}
          </motion.span>
        </span>
        <span className={styles.lever} aria-hidden="true">
          🎰
        </span>
      </button>
      <p className={styles.hint}>{target === null ? 'Touche pour lancer' : ' '}</p>
    </div>
  );
}
