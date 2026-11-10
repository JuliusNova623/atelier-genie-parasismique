import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';

export function Home() {
  const navigate = useNavigate();
  const game = useGameStore((s) => s.game);
  const t = fr.home;

  const newGame = () => {
    if (game && !window.confirm(t.newGameWarning)) return;
    navigate('/new');
  };

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{fr.appName}</h1>
      <p className={styles.hint} style={{ textAlign: 'center' }}>
        {t.tagline}
      </p>
      <nav className={styles.menu} aria-label="Menu principal">
        {game && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => navigate('/play')}
          >
            {t.resume}
            <br />
            <small>{t.resumeInfo(game.players.length, game.log.length)}</small>
          </button>
        )}
        <button
          type="button"
          className={`${styles.btn} ${game ? '' : styles.btnPrimary}`}
          onClick={newGame}
        >
          {t.newGame}
        </button>
        <button type="button" className={styles.btn} onClick={() => navigate('/settings')}>
          {t.settings}
        </button>
        <button type="button" className={styles.btn} disabled title={t.soon}>
          {t.history}
        </button>
        <button type="button" className={styles.btn} disabled title={t.soon}>
          {t.import}
        </button>
        <button type="button" className={styles.btn} disabled title={t.soon}>
          {t.about}
        </button>
      </nav>
    </main>
  );
}
