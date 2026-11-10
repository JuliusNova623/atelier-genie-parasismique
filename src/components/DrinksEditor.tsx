import { fr } from '../i18n/fr';
import { clampDrinkCount, useSettings } from '../store/settings';
import styles from './ui.module.css';

/**
 * Les 20 boissons : un numéro = une boisson. Pour chacune, un nom (« Boisson n°X » si vide) et un
 * interrupteur alcoolisée / sans alcool. Les modifications sont enregistrées immédiatement.
 */
export function DrinksEditor() {
  const allDrinks = useSettings((s) => s.drinks);
  const count = useSettings((s) => s.drinkCount);
  const update = useSettings((s) => s.update);
  const setDrinks = useSettings((s) => s.setDrinks);
  // Seules les N premières boissons sont en jeu ; les autres restent mémorisées.
  const drinks = allDrinks.slice(0, count);
  const t = fr.drinks;

  const patch = (number: number, change: { name?: string; noAlcohol?: boolean }) =>
    void setDrinks(allDrinks.map((d) => (d.number === number ? { ...d, ...change } : d)));

  const setAll = (noAlcohol: boolean) =>
    void setDrinks(allDrinks.map((d) => (d.number <= count ? { ...d, noAlcohol } : d)));

  const setCount = (n: number) => void update({ drinkCount: clampDrinkCount(n) });

  const soft = drinks.filter((d) => d.noAlcohol).length;

  return (
    <div className={styles.menu}>
      <p className={styles.hint}>{t.hint}</p>
      <div className={styles.row} role="group" aria-label={t.countLabel}>
        <strong className={styles.grow}>{t.countLabel}</strong>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={t.less}
          disabled={count <= 1}
          onClick={() => setCount(count - 1)}
        >
          −
        </button>
        <span aria-live="polite" style={{ minWidth: 110, textAlign: 'center', fontWeight: 700 }}>
          {t.countValue(count)}
        </span>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={t.more}
          disabled={count >= 20}
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
      <p className={styles.hint}>{t.countHint}</p>
      <p role="status" style={{ margin: 0, fontWeight: 700 }}>
        {t.counts(drinks.length - soft, soft)}
      </p>
      <div className={styles.row}>
        <button type="button" className={styles.btn} onClick={() => setAll(false)}>
          🍺 {t.allAlcoholic}
        </button>
        <button type="button" className={styles.btn} onClick={() => setAll(true)}>
          🧃 {t.allSoft}
        </button>
      </div>

      <ul className={styles.ranking}>
        {drinks.map((d) => (
          <li key={d.number}>
            <strong aria-hidden="true" style={{ width: 28, textAlign: 'right' }}>
              {d.number}
            </strong>
            <input
              className={styles.input}
              style={{ flex: '1 1 110px', minWidth: 110, width: 'auto' }}
              aria-label={t.nameLabel(d.number)}
              placeholder={t.placeholder(d.number)}
              value={d.name}
              maxLength={40}
              onChange={(e) => patch(d.number, { name: e.target.value })}
            />
            <button
              type="button"
              className={styles.btn}
              role="switch"
              aria-checked={d.noAlcohol}
              aria-label={t.typeLabel(d.number)}
              style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}
              onClick={() => patch(d.number, { noAlcohol: !d.noAlcohol })}
            >
              {d.noAlcohol ? `🧃 ${t.soft}` : `🍺 ${t.alcoholic}`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
