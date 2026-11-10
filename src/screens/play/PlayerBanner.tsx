import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoreSheet } from '../../components/ScoreSheet';
import styles from '../../components/ui.module.css';
import { currentPlayerId, getPlayer, playerScores } from '../../engine/game';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';

export function PlayerBanner({ game }: { game: Game }) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  const player = getPlayer(game, currentPlayerId(game));
  const score = playerScores(game)[player.id];
  const team = game.teams.find((t) => t.id === player.teamId);

  return (
    <>
      <header
        className={styles.playerRow}
        style={{ ['--player-color' as string]: player.color }}
        aria-label={`${fr.play.turnOf} ${player.name}`}
      >
        <span className={styles.avatar} aria-hidden="true">
          {player.avatar}
        </span>
        <div className={styles.grow}>
          <p className={styles.hint}>
            {fr.play.turnOf}
            {team ? ` · ${team.name}` : ''}
          </p>
          <strong style={{ color: player.color, fontSize: '1.3rem', overflowWrap: 'anywhere' }}>
            {player.name}
          </strong>
          <p className={styles.hint}>{fr.play.score(score)}</p>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={fr.play.scores.open}
          onClick={() => setSheet(true)}
        >
          🏆
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={fr.play.toHome}
          onClick={() => navigate('/')}
        >
          🏠
        </button>
      </header>
      {sheet && <ScoreSheet game={game} onClose={() => setSheet(false)} />}
    </>
  );
}
