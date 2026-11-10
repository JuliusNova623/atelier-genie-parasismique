import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { createDeck } from '../engine/deck';
import { randomInt, shuffle } from '../engine/rng';
import { useOnceTrigger } from './anim';
import styles from './pickers.module.css';
import type { NumberPickerProps } from './types';

/**
 * 20 cartes face cachée, positions mélangées. La carte touchée révèle le numéro déjà tiré :
 * on échange simplement ce numéro avec celui qui se trouvait sous la carte touchée.
 * Les numéros déjà joués sont retournés et grisés (non sélectionnables).
 */
export function FaceDownCards({
  max,
  excluded,
  target,
  onTrigger,
  onDone,
  reduced,
}: NumberPickerProps) {
  const [base] = useState(() => shuffle(createDeck(max)));
  const [touched, setTouched] = useState<number | null>(null);
  // Reprise : si le tirage existe déjà sans toucher, on choisit visuellement une carte libre.
  const [fallback] = useState(() => {
    const free = base.map((n, i) => (excluded.includes(n) ? -1 : i)).filter((i) => i >= 0);
    return free[randomInt(free.length)];
  });
  const trigger = useOnceTrigger(onTrigger, target);

  const flipped = target === null ? null : (touched ?? fallback);
  const layout = useMemo(() => {
    if (target === null || flipped === null) return base;
    const next = [...base];
    const at = next.indexOf(target);
    [next[flipped], next[at]] = [next[at], next[flipped]];
    return next;
  }, [base, target, flipped]);

  useEffect(() => {
    if (target === null) return;
    const done = setTimeout(() => onDone(target), reduced ? 300 : 1300);
    return () => clearTimeout(done);
  }, [target, reduced, onDone]);

  return (
    <div className={styles.box}>
      <div className={styles.cardGrid} role="group" aria-label="Cartes face cachée">
        {layout.map((n, pos) => {
          const burnt = excluded.includes(n) && pos !== flipped;
          const isFlipped = burnt || pos === flipped;
          return (
            <button
              key={pos}
              type="button"
              className={styles.faceCard}
              disabled={burnt || target !== null}
              aria-label={burnt ? `Carte ${n} déjà jouée` : `Carte face cachée ${pos + 1}`}
              onClick={() => {
                if (target !== null) return;
                setTouched(pos);
                trigger();
              }}
            >
              <motion.span
                className={styles.faceInner}
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: reduced ? 0 : 0.6 }}
              >
                <span className={styles.faceBack} aria-hidden="true">
                  ?
                </span>
                <span
                  className={`${styles.faceFront} ${burnt ? styles.burnt : ''}`}
                  aria-hidden="true"
                >
                  {isFlipped ? n : ''}
                </span>
              </motion.span>
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>{target === null ? 'Choisis une carte' : ' '}</p>
    </div>
  );
}
