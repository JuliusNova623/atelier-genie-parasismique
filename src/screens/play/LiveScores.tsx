import { currentPlayerId, playerScores, teamScores } from '../../engine/game';
import { rankScores } from '../../engine/results';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import styles from './play.module.css';

/** Scores en direct, toujours visibles en mode écran : tout le monde regarde la TV, pas son téléphone. */
export function LiveScores({ game }: { game: Game }) {
  const active = currentPlayerId(game);
  const players = rankScores(
    playerScores(game),
    game.players.map((p) => p.id),
  );
  const teams =
    game.mode === 'teams' && game.teams.length > 0
      ? rankScores(
          teamScores(game),
          game.teams.map((t) => t.id),
        )
      : null;
  const activeTeam = game.players.find((p) => p.id === active)?.teamId;

  return (
    <section className={styles.live} aria-label={fr.play.live}>
      <h2>{fr.play.live}</h2>
      {teams && (
        <ol>
          {teams.map((r) => {
            const t = game.teams.find((x) => x.id === r.id)!;
            return (
              <li
                key={t.id}
                data-active={t.id === activeTeam}
                style={{ ['--player-color' as string]: t.color }}
              >
                <span className={styles.rank}>{r.rank}.</span>
                <span className={styles.name}>{t.name}</span>
                <span className={styles.score}>{r.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      <ol>
        {players.map((r) => {
          const p = game.players.find((x) => x.id === r.id)!;
          return (
            <li
              key={p.id}
              data-active={p.id === active}
              style={{ ['--player-color' as string]: p.color }}
            >
              <span className={styles.rank}>{r.rank}.</span>
              <span aria-hidden="true">{p.avatar}</span>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.score}>{r.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
