import { useNavigate } from 'react-router-dom';
import { DrinksEditor } from '../components/DrinksEditor';
import styles from '../components/ui.module.css';
import { fr } from '../i18n/fr';

export function DrinksScreen() {
  const navigate = useNavigate();
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={fr.common.back}
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h1>{fr.drinks.title}</h1>
      </header>
      <DrinksEditor />
    </main>
  );
}
