import { useReducedMotion } from 'framer-motion';
import { useCallback } from 'react';
import styles from '../../components/ui.module.css';
import { remainingCards } from '../../engine/game';
import { pickerModeFor, playedCards } from '../../engine/turn';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { PICKERS, PICKER_LABELS, PICKER_ORDER } from '../../pickers/registry';
import { useContent } from '../../store/content';
import { useGameStore } from '../../store/game';
import { PlayerBanner } from './PlayerBanner';

/** Page du thème : choix du mode de tirage puis du numéro de carte (1 à 20). */
export function ThemeScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const spinCard = useGameStore((s) => s.spinCard);
  const reveal = useGameStore((s) => s.reveal);
  const selectPickerMode = useGameStore((s) => s.selectPickerMode);
  const reduced = useReducedMotion() ?? false;
  const onDone = useCallback(() => void reveal(), [reveal]);

  const pending = game.pending!;
  const theme = content.themes.find((t) => t.id === pending.themeId);
  const mode = pickerModeFor(game);
  const Picker = PICKERS[mode];
  const left = remainingCards(game, pending.themeId).length;
  const played = playedCards(game, pending.themeId);
  const max = Math.max(...(game.themeCards[pending.themeId] ?? [20]));
  const target = pending.stage === 'card' ? (pending.cardNumber ?? null) : null;

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <section
        className={styles.section}
        style={{ borderColor: theme?.color }}
        aria-label={theme?.name}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          <span aria-hidden="true">{theme?.emoji}</span> {theme?.name}
        </h1>
        {theme?.description && <p className={styles.hint}>{theme.description}</p>}
        <p role="status" style={{ margin: 0 }}>
          {fr.play.remaining(left)}
          {left === 1 && <strong> — {fr.play.lastCard}</strong>}
        </p>
      </section>

      <section className={styles.section} aria-label={fr.play.pickNumber}>
        <h2>{fr.play.pickNumber}</h2>
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
          key={`${game.log.length}-${mode}`}
          max={max}
          excluded={played}
          target={target}
          onTrigger={() => void spinCard()}
          onDone={onDone}
          reduced={reduced}
        />
        {mode !== 'cards' && played.length > 0 && (
          <div>
            <p className={styles.hint}>{fr.play.playedNumbers}</p>
            <div className={styles.row} aria-label={fr.play.playedNumbers}>
              {played.map((n) => (
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
      </section>
    </main>
  );
}
