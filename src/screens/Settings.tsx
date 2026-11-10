import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { BackupSection } from '../components/BackupSection';
import { RulesEditor } from '../components/RulesEditor';
import { validateRules } from '../engine/scoring';
import { fr } from '../i18n/fr';
import { VISUAL_THEMES, useSettings } from '../store/settings';

export function Settings() {
  const navigate = useNavigate();
  const s = useSettings();
  const t = fr.settings;

  const toggles = [
    ['sound', t.sound],
    ['haptics', t.haptics],
    ['keepAwake', t.keepAwake],
  ] as const;

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={fr.common.back}
          onClick={() => navigate('/')}
        >
          ←
        </button>
        <h1>{t.title}</h1>
      </header>

      <section className={styles.section} aria-label={t.visualTheme}>
        <h2>{t.visualTheme}</h2>
        <div className={styles.segment} role="group" aria-label={t.visualTheme}>
          {VISUAL_THEMES.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.btn}
              aria-pressed={s.visualTheme === v}
              onClick={() => s.update({ visualTheme: v })}
            >
              {t.themes[v]}
            </button>
          ))}
        </div>
        {toggles.map(([key, label]) => (
          <label key={key} className={styles.check}>
            <input
              type="checkbox"
              checked={s[key]}
              onChange={(e) => s.update({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>

      <h2 style={{ margin: 0 }}>{t.defaultRules}</h2>
      <p className={styles.hint}>{t.defaultRulesHint}</p>
      <RulesEditor
        rules={s.defaultRules}
        onChange={(r) => {
          // Les règles invalides restent affichées mais ne sont pas enregistrées.
          if (validateRules(r).length === 0) void s.update({ defaultRules: r });
          else useSettings.setState({ defaultRules: r });
        }}
        showTeamRules
      />

      <section className={styles.section} aria-label={fr.drinks.title}>
        <h2>{fr.drinks.title}</h2>
        <button type="button" className={styles.btn} onClick={() => navigate('/drinks')}>
          🍺 {fr.drinks.open}
        </button>
      </section>

      <section className={styles.section} aria-label={t.data}>
        <h2>{t.data}</h2>
        <p className={styles.hint}>{t.dataWarning}</p>
        <BackupSection />
      </section>
    </main>
  );
}
