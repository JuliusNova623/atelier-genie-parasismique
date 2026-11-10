import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { repo } from '../db/repo';
import { buildResults, type Ranked } from '../engine/results';
import { computeStats } from '../engine/stats';
import type { Game } from '../engine/types';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';

const MEDALS = ['🥇', '🥈', '🥉'];
/** Hauteur relative des marches (rang 1 au centre). */
const HEIGHTS: Record<number, number> = { 1: 150, 2: 110, 3: 80 };

function Podium({
  ranking,
  label,
  nameOf,
  colorOf,
  avatarOf,
}: {
  ranking: Ranked[];
  label: string;
  nameOf: (id: string) => string;
  colorOf: (id: string) => string;
  avatarOf?: (id: string) => string;
}) {
  const reduced = useReducedMotion() ?? false;
  const top = ranking.filter((r) => r.rank <= 3);
  // Ordre visuel d'un podium : 2e, 1er, 3e.
  const order = [...top].sort((a, b) => {
    const pos = (r: Ranked) => (r.rank === 1 ? 1 : r.rank === 2 ? 0 : 2);
    return pos(a) - pos(b);
  });

  return (
    <section className={styles.section} aria-label={label}>
      <h2>{label}</h2>
      <ol
        className={styles.podium}
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
        aria-label={label}
      >
        {order.map((r) => (
          <li key={r.id} className={styles.podiumCol}>
            <span className={styles.avatar} aria-hidden="true">
              {avatarOf ? avatarOf(r.id) : MEDALS[r.rank - 1]}
            </span>
            <strong style={{ color: colorOf(r.id), overflowWrap: 'anywhere', textAlign: 'center' }}>
              {nameOf(r.id)}
            </strong>
            <span>{fr.end.pts(r.score)}</span>
            <motion.div
              className={styles.podiumStep}
              style={{ background: colorOf(r.id) }}
              initial={reduced ? false : { height: 0 }}
              animate={{ height: HEIGHTS[r.rank] ?? 60 }}
              transition={{ duration: 0.8, delay: (4 - r.rank) * 0.35, ease: 'easeOut' }}
            >
              <span aria-label={`Rang ${r.rank}`}>
                {MEDALS[r.rank - 1]} {r.rank}
              </span>
            </motion.div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Écran de fin : podium (joueurs, et équipes en mode équipes), statistiques, rejouer. */
export function EndScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const replay = useGameStore((s) => s.replay);
  const [state, setState] = useState<{ game?: Game; loaded: boolean }>({ loaded: false });

  useEffect(() => {
    let alive = true;
    void repo.getHistoryGame(id ?? '').then((game) => alive && setState({ game, loaded: true }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (!state.loaded) return null;
  const game = state.game;
  if (!game) {
    return (
      <main className={styles.screen}>
        <p role="alert">{fr.end.notFound}</p>
        <button type="button" className={styles.btn} onClick={() => navigate('/')}>
          {fr.play.toHome}
        </button>
      </main>
    );
  }

  const results = buildResults(game);
  const stats = computeStats(game);
  const player = (pid: string) => game.players.find((p) => p.id === pid)!;
  const team = (tid: string) => game.teams.find((t) => t.id === tid)!;
  const winners = results.teams
    ? results.winnerIds.map((w) => team(w).name)
    : results.winnerIds.map((w) => player(w).name);
  const nameOf = (pid: string) => player(pid).name;
  const byId = Object.fromEntries(stats.players.map((p) => [p.playerId, p]));

  const award = (label: string, pid: string | null, extra?: string) =>
    pid && (
      <li key={label}>
        <span>{label}</span>
        <strong>
          {player(pid).avatar} {nameOf(pid)}
          {extra ? ` · ${extra}` : ''}
        </strong>
      </li>
    );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1>{fr.end.title}</h1>
      </header>

      <section className={styles.section} role="status">
        <h2>
          {winners.length > 1 ? fr.end.tie : fr.end.winners} : {fr.end.winner(winners.join(' & '))}
        </h2>
      </section>

      {results.teams && (
        <Podium
          ranking={results.teams}
          label={fr.end.teamsPodium}
          nameOf={(tid) => team(tid).name}
          colorOf={(tid) => team(tid).color}
        />
      )}
      <Podium
        ranking={results.players}
        label={results.teams ? fr.end.playersRanking : fr.end.podium}
        nameOf={nameOf}
        colorOf={(pid) => player(pid).color}
        avatarOf={(pid) => player(pid).avatar}
      />

      <section className={styles.section} aria-label={fr.end.perPlayer}>
        <h2>{fr.end.perPlayer}</h2>
        <ol className={styles.ranking}>
          {results.players.map((r) => (
            <li key={r.id} style={{ ['--player-color' as string]: player(r.id).color }}>
              <span>{r.rank}.</span>
              <span aria-hidden="true">{player(r.id).avatar}</span>
              <span className={styles.grow}>
                <strong>{nameOf(r.id)}</strong>
                <small className={styles.hint} style={{ display: 'block' }}>
                  {fr.end.columns.done} {byId[r.id].done} · {fr.end.columns.drunk}{' '}
                  {byId[r.id].drunk}
                </small>
              </span>
              <strong>{r.score}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-label={fr.end.stats}>
        <h2>{fr.end.stats}</h2>
        <ul className={styles.stats}>
          <li>
            <span>{fr.end.totals.done}</span>
            <strong>{stats.totals.done}</strong>
          </li>
          <li>
            <span>{fr.end.totals.drunk}</span>
            <strong>{stats.totals.drunk}</strong>
          </li>
          {stats.totals.noDrink > 0 && (
            <li>
              <span>{fr.end.totals.noDrink}</span>
              <strong>{stats.totals.noDrink}</strong>
            </li>
          )}
          {award(fr.end.awards.bravest, stats.bravest)}
          {award(fr.end.awards.drinker, stats.biggestDrinker)}
          {award(
            fr.end.awards.streak,
            stats.bestStreak?.playerId ?? null,
            stats.bestStreak ? fr.end.streak(stats.bestStreak.length) : undefined,
          )}
        </ul>
      </section>

      <div className={styles.bigActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={async () => {
            await replay(game);
            navigate('/play', { replace: true });
          }}
        >
          {fr.end.replay}
        </button>
        <button type="button" className={styles.btn} onClick={() => navigate('/new')}>
          {fr.end.newGame}
        </button>
        <button type="button" className={styles.btn} onClick={() => navigate('/')}>
          {fr.play.toHome}
        </button>
      </div>
    </main>
  );
}
