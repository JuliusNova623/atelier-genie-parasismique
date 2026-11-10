import { useAnimate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { randomInt } from '../engine/rng';
import type { Theme } from '../content/schema';
import styles from './wheel.module.css';

interface Props {
  themes: Theme[];
  exhausted: string[];
  /** Thème déjà tiré par le moteur (null = roue au repos). La roue ne fait que s'arrêter dessus. */
  targetId: string | null;
  onTrigger: () => void;
  onDone: () => void;
  reduced: boolean;
}

const SIZE = 300;
const C = SIZE / 2;
const R = 142;

const point = (angleDeg: number, r: number): [number, number] => {
  const a = (angleDeg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};

function sectorPath(i: number, n: number): string {
  const step = 360 / n;
  const [x0, y0] = point(i * step, R);
  const [x1, y1] = point((i + 1) * step, R);
  return `M${C} ${C} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`;
}

/** Rotation finale : le secteur `index` (plus un léger décalage visuel dans le secteur) sous le pointeur. */
export function finalRotation(
  from: number,
  index: number,
  n: number,
  spins: number,
  jitter: number,
) {
  const center = index * (360 / n) + 360 / n / 2 + jitter;
  const delta = (((-center - from) % 360) + 360) % 360;
  return from + spins * 360 + delta;
}

export function ThemeWheel({ themes, exhausted, targetId, onTrigger, onDone, reduced }: Props) {
  const [scope, animate] = useAnimate();
  const rotation = useRef(0);
  const fired = useRef(false);
  const n = themes.length;

  useEffect(() => {
    if (targetId === null || !scope.current) return;
    const index = themes.findIndex((t) => t.id === targetId);
    if (index < 0) return;
    let cancelled = false;
    const half = 360 / n / 2;
    const jitter = randomInt(Math.floor(half * 1.4)) - Math.floor(half * 0.7);
    const to = finalRotation(rotation.current, index, n, reduced ? 0 : 5, jitter);
    rotation.current = to;
    const controls = animate(
      scope.current,
      { rotate: to },
      { duration: reduced ? 0.3 : 4.5, ease: [0.12, 0.8, 0.2, 1] },
    );
    controls.then(() => {
      if (!cancelled) setTimeout(() => !cancelled && onDone(), reduced ? 100 : 600);
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [targetId, themes, n, reduced, animate, scope, onDone]);

  const spin = () => {
    if (fired.current || targetId !== null) return;
    fired.current = true;
    onTrigger();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.pointer} aria-hidden="true" />
      <div
        className={styles.rotor}
        ref={scope}
        role="button"
        tabIndex={0}
        aria-label="Lancer la roulette des thèmes"
        onClick={spin}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            spin();
          }
        }}
        onPointerDown={(e) => {
          // Swipe : un glissement d'au moins 40 px lance aussi la roue.
          const startX = e.clientX;
          const startY = e.clientY;
          const move = (ev: PointerEvent) => {
            if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 40) {
              cleanup();
              spin();
            }
          };
          const cleanup = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', cleanup);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', cleanup);
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg} aria-hidden="true">
          {themes.map((t, i) => {
            const off = exhausted.includes(t.id);
            const [tx, ty] = point(i * (360 / n) + 360 / n / 2, 100);
            return (
              <g key={t.id} opacity={off ? 0.35 : 1}>
                <path
                  d={sectorPath(i, n)}
                  fill={off ? '#555' : t.color}
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth="2"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="26"
                  transform={`rotate(${i * (360 / n) + 360 / n / 2} ${tx} ${ty})`}
                >
                  {t.emoji}
                </text>
              </g>
            );
          })}
          <circle cx={C} cy={C} r="22" fill="#12001f" stroke="#fff" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}
