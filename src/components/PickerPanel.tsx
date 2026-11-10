import { useReducedMotion } from 'framer-motion';
import { useCallback } from 'react';
import { pickerModeFor } from '../engine/turn';
import type { Game } from '../engine/types';
import { fr } from '../i18n/fr';
import { PICKERS, PICKER_LABELS, PICKER_ORDER } from '../pickers/registry';
import { useGameStore } from '../store/game';
import styles from './ui.module.css';

interface Props {
  game: Game;
  max: number;
  /** Numéros déjà joués (grillés). Vide pour les boissons. */
  excluded: number[];
  /** Résultat déjà tiré par le moteur, ou null avant le déclenchement. */
  target: number | null;
  onTrigger: () => void;
  /** Identifie l'étape : change à chaque nouveau tirage pour remonter le sélecteur. */
  stepKey: string;
  showPlayed?: boolean;
}

/** Choix du mode de tirage + sélecteur de numéro, partagé par les cartes et les boissons. */
export function PickerPanel({
  game,
  max,
  excluded,
  target,
  onTrigger,
  stepKey,
  showPlayed,
}: Props) {
  const reveal = useGameStore((s) => s.reveal);
  const selectPickerMode = useGameStore((s) => s.selectPickerMode);
  const reduced = useReducedMotion() ?? false;
  const onDone = useCallback(() => void reveal(), [reveal]);
  const mode = pickerModeFor(game);
  const Picker = PICKERS[mode];

  return (
    <>
      <div className={styles.segment} role="group" aria-label={fr.play.mode}>
        {PICKER_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            className={styles.btn}
            aria-pressed={mode === m}
            disabled={target !== null}
            onClick={() => void selectPickerMode(m)}
          >
            {PICKER_LABELS[m]}
          </button>
        ))}
      </div>
      <Picker
        key={`${stepKey}-${mode}`}
        max={max}
        excluded={excluded}
        target={target}
        onTrigger={onTrigger}
        onDone={onDone}
        reduced={reduced}
      />
      {showPlayed && mode !== 'cards' && excluded.length > 0 && (
        <div>
          <p className={styles.hint}>{fr.play.playedNumbers}</p>
          <div className={styles.row} aria-label={fr.play.playedNumbers}>
            {excluded.map((n) => (
              <span
                key={n}
                style={{
                  textDecoration: 'line-through',
                  opacity: 0.6,
                  padding: '2px 6px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
