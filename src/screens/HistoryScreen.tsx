import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { repo } from '../db/repo';
import { buildResults } from '../engine/results';
import type { Game } from '../engine/types';
import { fr } from '../i18n/fr';

export function HistoryScreen() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.history().then((g) => alive && setGames(g));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (g: Game) => {
    if (!window.confirm(fr.history.deleteConfirm)) return;
    await repo.deleteHistoryGame(g.id);
    setGames((cur) => cur?.filter((x) => x.id !== g.id) ?? null);
  };

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
        <h1>{fr.history.title}</h1>
      </header>

      {games === null ? null : games.length === 0 ? (
        <p className={styles.hint} role="status">
          {fr.history.empty}
        </p>
      ) : (
        <ul className={styles.ranking}>
          {games.map((g) => {
            const r = buildResults(g);
            const label = (id: string) =>
              r.teams
                ? (g.teams.find((t) => t.id === id)?.name ?? id)
                : (g.players.find((p) => p.id === id)?.name ?? id);
            const top = r.teams ?? r.players;
            const date = new Date(g.endedAt ?? g.startedAt).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            return (
              <li key={g.id} style={{ flexWrap: 'wrap' }}>
                <div className={styles.grow}>
                  <strong>🏆 {r.winnerIds.map(label).join(' & ')}</strong>
                  <small className={styles.hint} style={{ display: 'block' }}>
                    {date} · {fr.history.players(g.players.length)} ·{' '}
                    {fr.history.turns(g.log.length)}
                  </small>
                  <small style={{ display: 'block' }}>
                    {top.map((x) => `${label(x.id)} ${x.score}`).join(' · ')}
                  </small>
                </div>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => navigate(`/end/${g.id}`)}
                  aria-label={`${fr.play.scores.open} ${date}`}
                >
                  📊
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  aria-label={`${fr.history.delete} ${date}`}
                  onClick={() => void remove(g)}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
