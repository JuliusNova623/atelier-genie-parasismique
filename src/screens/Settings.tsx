import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { RulesEditor } from '../components/RulesEditor';
import { validateRules } from '../engine/scoring';
import { fr } from '../i18n/fr';
import { VISUAL_THEMES, useSettings } from '../store/settings';

export function Settings() {
  const navigate = useNavigate();
  const s = useSettings();
  const t = fr.settings;

  const setDrink = (number: number, patch: { name?: string; noAlcohol?: boolean }) =>
    s.setDrinks(s.drinks.map((d) => (d.number === number ? { ...d, ...patch } : d)));

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

      <section className={styles.section} aria-label={t.drinks}>
        <h2>{t.drinks}</h2>
        <p className={styles.hint}>{t.drinksHint}</p>
        {s.drinks.map((d) => (
          <div key={d.number} className={styles.row}>
            <span aria-hidden="true" style={{ width: 28, textAlign: 'right' }}>
              {d.number}
            </span>
            <input
              className={`${styles.input} ${styles.grow}`}
              aria-label={`Nom de la boisson ${d.number}`}
              placeholder={t.drinkPlaceholder(d.number)}
              value={d.name}
              maxLength={40}
              onChange={(e) => setDrink(d.number, { name: e.target.value })}
            />
            <label className={styles.check}>
              <input
                type="checkbox"
                aria-label={`${t.drinkNoAlcohol} : boisson ${d.number}`}
                checked={d.noAlcohol}
                onChange={(e) => setDrink(d.number, { noAlcohol: e.target.checked })}
              />
              <small>{t.drinkNoAlcohol}</small>
            </label>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-label={t.data}>
        <h2>{t.data}</h2>
        <p className={styles.hint}>{t.dataWarning}</p>
      </section>
    </main>
  );
}
