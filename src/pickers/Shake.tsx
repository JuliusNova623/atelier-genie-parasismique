import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useOnceTrigger } from './anim';
import styles from './pickers.module.css';
import type { NumberPickerProps } from './types';

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };

const SPIKE = 14; // variation d'accélération (m/s²) comptée comme une secousse
const SHAKES_NEEDED = 3;
const WINDOW_MS = 900;

/**
 * Secouer le téléphone : DeviceMotionEvent. La secousse ne fait que DÉCLENCHER l'animation,
 * le numéro est déjà tiré. Repli automatique sur un bouton si indisponible ou refusé.
 */
export function Shake({ target, onTrigger, onDone, reduced }: NumberPickerProps) {
  const supported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const needsPermission =
    supported && typeof (window.DeviceMotionEvent as MotionCtor).requestPermission === 'function';
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>(
    needsPermission ? 'unknown' : supported ? 'granted' : 'denied',
  );
  const [settled, setSettled] = useState(false);
  const trigger = useOnceTrigger(onTrigger, target);
  const triggerRef = useRef(trigger);
  useEffect(() => {
    triggerRef.current = trigger;
  });

  // Détection de la secousse.
  useEffect(() => {
    if (permission !== 'granted' || target !== null) return;
    let last = 0;
    let spikes: number[] = [];
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const delta = Math.abs(mag - last);
      last = mag;
      const now = Date.now();
      if (delta > SPIKE) {
        spikes = [...spikes.filter((t) => now - t < WINDOW_MS), now];
        if (spikes.length >= SHAKES_NEEDED) triggerRef.current();
      }
    };
    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [permission, target]);

  // Animation puis fin.
  useEffect(() => {
    if (target === null) return;
    const wobble = reduced ? 150 : 1400;
    const end = setTimeout(() => setSettled(true), wobble);
    const done = setTimeout(() => onDone(target), wobble + (reduced ? 200 : 700));
    return () => {
      clearTimeout(end);
      clearTimeout(done);
    };
  }, [target, reduced, onDone]);

  const askPermission = async () => {
    try {
      const res = await (window.DeviceMotionEvent as MotionCtor).requestPermission?.();
      setPermission(res === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  };

  const shaking = target !== null && !settled;

  return (
    <div className={styles.box}>
      <motion.div
        className={styles.phone}
        aria-hidden="true"
        animate={
          shaking && !reduced
            ? { rotate: [0, -18, 18, -14, 14, -8, 8, 0], x: [0, -10, 10, -8, 8, 0] }
            : { rotate: 0, x: 0 }
        }
        transition={{ duration: 1.4 }}
      >
        📱
      </motion.div>
      {target === null && permission === 'unknown' && (
        <button type="button" className={styles.action} onClick={askPermission}>
          Activer la secousse
        </button>
      )}
      <button
        type="button"
        className={styles.action}
        disabled={target !== null}
        onClick={trigger}
        aria-label="Lancer sans secouer"
      >
        {permission === 'granted' ? 'Secoue le téléphone… ou touche ici' : 'Lancer'}
      </button>
    </div>
  );
}
