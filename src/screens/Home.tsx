import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { useIsTv } from '../util/display';
import { toggleFullscreen } from '../util/fullscreen';

export function Home() {
  const navigate = useNavigate();
  const game = useGameStore((s) => s.game);
  const t = fr.home;
  const tv = useIsTv();
  const update = useSettings((s) => s.update);

  const newGame = () => {
    if (game && !window.confirm(t.newGameWarning)) return;
    navigate('/new');
  };

  return (
    <main className={styles.screen}>
      <p className={styles.kicker}>{t.kicker}</p>
      <h1 className={styles.title}>
        Roulette <span style={{ display: 'block' }}>Soirée</span>
      </h1>
      <p className={styles.byline}>
        {t.by} <span className={styles.name}>{t.author}</span>
        <br />
        <span className={styles.maestro}>{t.maestro}</span>
      </p>
      <div className={styles.divider} />

      <nav className={styles.menu} aria-label="Menu principal">
        {game && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ minHeight: 64 }}
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
          style={game ? undefined : { minHeight: 64, fontSize: '1.15rem' }}
          onClick={newGame}
        >
          {t.newGame}
        </button>
        <div className={styles.numberGrid}>
          <button type="button" className={styles.btn} onClick={() => navigate('/drinks')}>
            🍺 {t.drinks}
          </button>
          <button type="button" className={styles.btn} onClick={() => navigate('/settings')}>
            {t.settings}
          </button>
          <button type="button" className={styles.btn} onClick={() => navigate('/history')}>
            {t.history}
          </button>
          <button type="button" className={styles.btn} onClick={() => navigate('/import')}>
            {t.import}
          </button>
        </div>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            // Mode écran : mise en page grand écran + plein écran (geste utilisateur requis).
            void update({ display: tv ? 'phone' : 'tv' });
            if (!tv) void toggleFullscreen();
          }}
        >
          {tv ? t.tvOff : t.tvOn}
        </button>
        <button type="button" className={styles.btn} onClick={() => navigate('/about')}>
          {t.about}
        </button>
      </nav>
      <p className={styles.footer}>{t.footer}</p>
    </main>
  );
}
