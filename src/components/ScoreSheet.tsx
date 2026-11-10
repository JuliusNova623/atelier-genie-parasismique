import { useState } from 'react';
import { playerScores, remainingJokers, teamScores } from '../engine/game';
import type { Game, JokerType } from '../engine/types';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';
import styles from './ui.module.css';

const JOKERS: JokerType[] = ['pass', 'double', 'transfer'];

/** Tableau des scores en bottom sheet : classement, jokers restants, annulation du dernier tour. */
export function ScoreSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const undo = useGameStore((s) => s.undo);
  const hasTeams = game.mode === 'teams' && game.teams.length > 0;
  const [tab, setTab] = useState<'teams' | 'players'>(hasTeams ? 'teams' : 'players');
  const t = fr.play.scores;

  const scores = playerScores(game);
  const players = [...game.players].sort((a, b) => scores[b.id] - scores[a.id]);
  const tScores = teamScores(game);
  const teams = [...game.teams].sort((a, b) => tScores[b.id] - tScores[a.id]);

  const askUndo = () => {
    if (window.confirm(t.undoConfirm)) {
      void undo();
      onClose();
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className={styles.header}>
          <h2 style={{ margin: 0, flex: 1 }}>{t.title}</h2>
          <button
            type="button"
            className={`${styles.btn} ${styles.iconBtn}`}
            aria-label={t.close}
            onClick={onClose}
            autoFocus
          >
            ✕
          </button>
        </div>

        {hasTeams && (
          <div className={styles.segment} role="group">
            <button
              type="button"
              className={styles.btn}
              aria-pressed={tab === 'teams'}
              onClick={() => setTab('teams')}
            >
              {t.teams}
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={tab === 'players'}
              onClick={() => setTab('players')}
            >
              {t.players}
            </button>
          </div>
        )}

        <ol className={styles.ranking}>
          {tab === 'teams'
            ? teams.map((tm, i) => (
                <li key={tm.id} style={{ ['--player-color' as string]: tm.color }}>
                  <span>{i + 1}.</span>
                  <strong className={styles.grow}>{tm.name}</strong>
                  <span>{tScores[tm.id]}</span>
                </li>
              ))
            : players.map((p, i) => {
                const j = remainingJokers(game, p.id);
                return (
                  <li key={p.id} style={{ ['--player-color' as string]: p.color }}>
                    <span>{i + 1}.</span>
                    <span aria-hidden="true">{p.avatar}</span>
                    <span className={styles.grow}>
                      <strong>{p.name}</strong>
                      <small
                        className={styles.hint}
                        style={{ display: 'block' }}
                        aria-label={`${t.jokers} : ${JOKERS.map((k) => `${fr.play.jokers[k]} ${j[k]}`).join(', ')}`}
                      >
                        {JOKERS.map((k) => `${fr.play.jokers[k]} ${j[k]}`).join(' · ')}
                      </small>
                    </span>
                    <span>{scores[p.id]}</span>
                  </li>
                );
              })}
        </ol>

        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          disabled={game.log.length === 0}
          onClick={askUndo}
        >
          {t.undo}
        </button>
      </div>
    </div>
  );
}
