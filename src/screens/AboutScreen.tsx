import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { fr } from '../i18n/fr';

export function AboutScreen() {
  const navigate = useNavigate();
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
        <h1>{fr.about.title}</h1>
      </header>
      <section className={styles.section}>
        <h2>{fr.appName}</h2>
        <p style={{ margin: 0 }}>{fr.about.version(__APP_VERSION__)}</p>
        <p style={{ margin: 0 }}>{fr.about.offline}</p>
        <p style={{ margin: 0 }}>{fr.about.storage}</p>
        <p className={styles.hint}>{fr.about.responsible}</p>
      </section>
    </main>
  );
}
