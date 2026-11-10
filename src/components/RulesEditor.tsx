import { fr } from '../i18n/fr';
import { validateRules } from '../engine/scoring';
import type { JokerType, Rules } from '../engine/types';
import { NumberField } from './NumberField';
import styles from './ui.module.css';

interface Props {
  rules: Rules;
  onChange: (rules: Rules) => void;
  readOnly?: boolean;
  /** Affiche les règles d'équipe (mode équipes). */
  showTeamRules?: boolean;
}

const JOKERS: JokerType[] = ['pass', 'double', 'transfer'];

export function RulesEditor({ rules, onChange, readOnly, showTeamRules }: Props) {
  const set = (patch: Partial<Rules>) => onChange({ ...rules, ...patch });
  const errors = validateRules(rules);
  const t = fr.rules;

  return (
    <div className={styles.menu}>
      {readOnly && <p className={styles.hint}>{t.locked}</p>}

      <section className={styles.section} aria-label={t.scoring}>
        <h2>{t.scoring}</h2>
        <div className={styles.numberGrid}>
          <NumberField
            label={t.pointsCard}
            value={rules.pointsCard}
            disabled={readOnly}
            onChange={(v) => set({ pointsCard: v ?? 0 })}
          />
          <NumberField
            label={t.pointsDrinkDrunk}
            value={rules.pointsDrinkDrunk}
            disabled={readOnly}
            onChange={(v) => set({ pointsDrinkDrunk: v ?? 0 })}
          />
        </div>
        {errors.length > 0 && (
          <ul className={styles.errors} role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-label={t.jokers}>
        <h2>{t.jokers}</h2>
        {JOKERS.map((j) => (
          <div key={j} className={styles.row}>
            <label className={`${styles.check} ${styles.grow}`}>
              <input
                type="checkbox"
                checked={rules.jokers[j].enabled}
                disabled={readOnly}
                onChange={(e) =>
                  set({
                    jokers: {
                      ...rules.jokers,
                      [j]: { ...rules.jokers[j], enabled: e.target.checked },
                    },
                  })
                }
              />
              {t.jokerNames[j]}
            </label>
            <select
              className={styles.select}
              style={{ width: 90 }}
              aria-label={`${t.jokerNames[j]} : nombre`}
              value={rules.jokers[j].count}
              disabled={readOnly || !rules.jokers[j].enabled}
              onChange={(e) =>
                set({
                  jokers: {
                    ...rules.jokers,
                    [j]: { ...rules.jokers[j], count: Number(e.target.value) },
                  },
                })
              }
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-label={t.end}>
        <h2>{t.end}</h2>
        <p className={styles.hint}>{t.endHint}</p>
        <div className={styles.numberGrid}>
          <NumberField
            label={t.maxRounds}
            nullable
            min={1}
            value={rules.end.maxRounds}
            disabled={readOnly}
            onChange={(v) => set({ end: { ...rules.end, maxRounds: v } })}
          />
          <NumberField
            label={t.targetScore}
            nullable
            min={1}
            value={rules.end.targetScore}
            disabled={readOnly}
            onChange={(v) => set({ end: { ...rules.end, targetScore: v } })}
          />
          <NumberField
            label={t.durationMinutes}
            nullable
            min={1}
            value={rules.end.durationMinutes}
            disabled={readOnly}
            onChange={(v) => set({ end: { ...rules.end, durationMinutes: v } })}
          />
        </div>
        <p className={styles.hint}>Vide = {t.none.toLowerCase()}.</p>
      </section>

      <section className={styles.section}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={rules.hydrationEvery !== null}
            disabled={readOnly}
            onChange={(e) => set({ hydrationEvery: e.target.checked ? 8 : null })}
          />
          {t.hydration}
        </label>
        {rules.hydrationEvery !== null && (
          <NumberField
            label={t.hydrationEvery}
            min={1}
            value={rules.hydrationEvery}
            disabled={readOnly}
            onChange={(v) => set({ hydrationEvery: Math.max(1, v ?? 1) })}
          />
        )}
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={rules.randomPlayer}
            disabled={readOnly}
            onChange={(e) => set({ randomPlayer: e.target.checked })}
          />
          {t.randomPlayer}
        </label>
      </section>

      {showTeamRules && (
        <section className={styles.section} aria-label={t.teamRules}>
          <h2>{t.teamRules}</h2>
          {(
            [
              ['opponentDecides', t.opponentDecides],
              ['duel', t.duel],
              ['sharedJokers', t.sharedJokers],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={styles.check}>
              <input
                type="checkbox"
                checked={rules.teamRules[key]}
                disabled={readOnly}
                onChange={(e) =>
                  set({ teamRules: { ...rules.teamRules, [key]: e.target.checked } })
                }
              />
              {label}
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
