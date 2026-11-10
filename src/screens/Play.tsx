import { Navigate, useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { currentPlayerId, getPlayer, playerScores } from '../engine/game';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';

/** Écran provisoire : la roulette des thèmes arrive à l'étape 5. */
export function Play() {
  const navigate = useNavigate();
  const game = useGameStore((s) => s.game);
  if (!game) return <Navigate to="/" replace />;
  const player = getPlayer(game, currentPlayerId(game));
  const scores = playerScores(game);

  return (
    <main className={styles.screen}>
      <section className={styles.section} aria-live="polite">
        <p className={styles.hint}>{fr.play.turnOf}</p>
        <h1 style={{ margin: 0, color: player.color }}>
          <span aria-hidden="true">{player.avatar}</span> {player.name}
        </h1>
        <p className={styles.hint}>Score : {scores[player.id]}</p>
      </section>
      <p className={styles.hint}>{fr.play.placeholder}</p>
      <button type="button" className={styles.btn} onClick={() => navigate('/')}>
        {fr.play.toHome}
      </button>
    </main>
  );
}
