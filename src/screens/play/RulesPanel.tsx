import styles from '../../components/ui.module.css';
import { deriveEffects, type ActiveRule } from '../../engine/effects';
import { getPlayer } from '../../engine/game';
import type { Game } from '../../engine/types';
import { useGameStore } from '../../store/game';
import { FlowPanel } from './FlowScreen';

/** Règles et boucliers en cours, avec « Faute » et fin anticipée ; héberge aussi fautes et résolutions. */
export function RulesPanel({ game }: { game: Game }) {
  const store = useGameStore();
  const { rules, shields } = deriveEffects(game);
  const interlude = store.interlude;
  const idle = !game.pending;

  if (interlude) {
    return (
      <section className={styles.section} aria-label="Règle en cours" data-interlude>
        <FlowPanel game={game} flow={interlude} onAnswer={(i) => void store.answerInterlude(i)} />
        <button type="button" className={styles.btn} onClick={() => store.cancelInterlude()}>
          Annuler
        </button>
      </section>
    );
  }
  if (!rules.length && !shields.length) return null;

  const who = (r: ActiveRule) =>
    r.subjects === 'all' ? 'tous' : r.subjects.map((id) => getPlayer(game, id).name).join(', ');

  return (
    <section className={styles.section} aria-label="Règles en cours" data-rules>
      <h2>📜 Règles en cours</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rules.map((r) => (
          <li key={r.id} data-rule={r.id}>
            <strong>{r.text}</strong>
            <small>
              {' '}
              · {who(r)}
              {r.turnsLeft !== undefined ? ` · ${r.turnsLeft} tour(s)` : ''}
              {r.due ? ' · à résoudre' : ''}
            </small>
            {idle && (
              <div className={styles.segment}>
                {r.due && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => store.startResolution(r.id)}
                  >
                    Résoudre
                  </button>
                )}
                {r.fault && (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => store.startFault(r.id)}
                  >
                    ⚠️ Faute
                  </button>
                )}
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => void store.endRule(r.id)}
                >
                  Terminer
                </button>
              </div>
            )}
          </li>
        ))}
        {shields.map((s) => (
          <li key={s.id}>
            🛡️ {getPlayer(game, s.protector).name} boit à la place de{' '}
            {getPlayer(game, s.owner).name}
          </li>
        ))}
      </ul>
    </section>
  );
}
