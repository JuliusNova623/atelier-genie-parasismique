import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '../db/repo';
import styles from '../components/ui.module.css';
import { DrinksEditor } from '../components/DrinksEditor';
import { RulesEditor } from '../components/RulesEditor';
import { createGame } from '../engine/game';
import { validateRules } from '../engine/scoring';
import {
  AVATARS,
  MAX_PLAYERS,
  assignTeamsBalanced,
  buildTurnOrder,
  makePlayer,
  makeTeams,
  validatePlayers,
  validateTeams,
} from '../engine/setup';
import type { Player, Rules, Team } from '../engine/types';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';

export function NewGame() {
  const navigate = useNavigate();
  const setGame = useGameStore((s) => s.setGame);
  const defaultRules = useSettings((s) => s.defaultRules);
  const t = fr.newGame;

  const [players, setPlayers] = useState<Player[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'solo' | 'teams'>('solo');
  const [teams, setTeams] = useState<Team[]>(() => makeTeams(2));
  const [order, setOrder] = useState<'entry' | 'random'>('entry');
  const [rules, setRules] = useState<Rules>(defaultRules);
  const [busy, setBusy] = useState(false);

  const errors = useMemo(() => {
    const e = [...validatePlayers(players), ...validateRules(rules)];
    if (mode === 'teams') e.push(...validateTeams(players, teams));
    return e;
  }, [players, rules, mode, teams]);

  const addPlayer = () => {
    const name = draft.trim();
    if (!name || players.length >= MAX_PLAYERS) return;
    const p = makePlayer(players.length, name);
    if (mode === 'teams') {
      const sizes = teams.map((tm) => players.filter((x) => x.teamId === tm.id).length);
      p.teamId = teams[sizes.indexOf(Math.min(...sizes))].id;
    }
    setPlayers([...players, p]);
    setDraft('');
  };

  const patch = (id: string, change: Partial<Player>) =>
    setPlayers(players.map((p) => (p.id === id ? { ...p, ...change } : p)));

  const move = (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= players.length) return;
    const next = [...players];
    [next[index], next[j]] = [next[j], next[index]];
    setPlayers(next);
  };

  const remove = (p: Player) => {
    if (window.confirm(t.confirmRemove(p.name))) setPlayers(players.filter((x) => x.id !== p.id));
  };

  const switchMode = (m: 'solo' | 'teams') => {
    setMode(m);
    setPlayers((ps) => (m === 'teams' ? assignTeamsBalanced(ps, teams) : ps));
  };

  const changeTeamCount = (count: number) => {
    const next = makeTeams(count, teams);
    setTeams(next);
    setPlayers(assignTeamsBalanced(players, next));
  };

  const start = async () => {
    if (errors.length || busy) return;
    setBusy(true);
    const content = await repo.getContent();
    const finalPlayers = players.map((p) => ({
      ...p,
      name: p.name.trim(),
      teamId: mode === 'teams' ? p.teamId : undefined,
    }));
    const game = createGame({
      now: Date.now(),
      mode,
      players: finalPlayers,
      teams: mode === 'teams' ? teams : [],
      rules: {
        ...rules,
        teamRules:
          mode === 'teams'
            ? rules.teamRules
            : { opponentDecides: false, duel: false, sharedJokers: false },
      },
      themes: content.themes.map((th) => ({
        id: th.id,
        cardNumbers: th.cards.map((c) => c.number),
      })),
      turnOrder: buildTurnOrder(finalPlayers, order),
    });
    await setGame(game);
    navigate('/play', { replace: true });
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
        <h1>{t.title}</h1>
      </header>

      <section className={styles.section} aria-label={t.players}>
        <h2>
          {t.players} ({players.length}/{MAX_PLAYERS})
        </h2>
        <form
          className={styles.row}
          onSubmit={(e) => {
            e.preventDefault();
            addPlayer();
          }}
        >
          <input
            className={`${styles.input} ${styles.grow}`}
            aria-label={t.playerName}
            placeholder={t.playerName}
            value={draft}
            maxLength={24}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!draft.trim() || players.length >= MAX_PLAYERS}
          >
            {t.addPlayer}
          </button>
        </form>

        {players.map((p, i) => (
          <div
            key={p.id}
            className={styles.playerRow}
            style={{ ['--player-color' as string]: p.color }}
          >
            <button
              type="button"
              className={`${styles.btn} ${styles.iconBtn} ${styles.avatar}`}
              aria-label={`${t.changeAvatar} : ${p.name}`}
              onClick={() =>
                patch(p.id, { avatar: AVATARS[(AVATARS.indexOf(p.avatar) + 1) % AVATARS.length] })
              }
            >
              {p.avatar}
            </button>
            <input
              className={`${styles.input} ${styles.nameInput}`}
              aria-label={`${t.playerName} ${i + 1}`}
              value={p.name}
              maxLength={24}
              onChange={(e) => patch(p.id, { name: e.target.value })}
            />
            <input
              type="color"
              className={styles.colorInput}
              aria-label={`${t.color} : ${p.name}`}
              value={p.color}
              onChange={(e) => patch(p.id, { color: e.target.value })}
            />
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={p.noAlcohol}
                aria-label={`${t.noAlcohol} : ${p.name}`}
                onChange={(e) => patch(p.id, { noAlcohol: e.target.checked })}
              />
              <small>{t.noAlcohol}</small>
            </label>
            {mode === 'teams' && (
              <select
                className={styles.select}
                style={{ width: 140 }}
                aria-label={`${t.team} : ${p.name}`}
                value={p.teamId ?? ''}
                onChange={(e) => patch(p.id, { teamId: e.target.value })}
              >
                {teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className={`${styles.btn} ${styles.iconBtn}`}
              aria-label={`${t.moveUp} : ${p.name}`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.iconBtn}`}
              aria-label={`${t.moveDown} : ${p.name}`}
              disabled={i === players.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.iconBtn} ${styles.btnDanger}`}
              aria-label={`${fr.common.remove} : ${p.name}`}
              onClick={() => remove(p)}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-label={t.mode}>
        <h2>{t.mode}</h2>
        <div className={styles.segment} role="group" aria-label={t.mode}>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={mode === 'solo'}
            onClick={() => switchMode('solo')}
          >
            {t.solo}
          </button>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={mode === 'teams'}
            onClick={() => switchMode('teams')}
          >
            {t.teams}
          </button>
        </div>
        {mode === 'teams' && (
          <>
            <div className={styles.field}>
              <label htmlFor="team-count">{t.teamCount}</label>
              <select
                id="team-count"
                className={styles.select}
                value={teams.length}
                onChange={(e) => changeTeamCount(Number(e.target.value))}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {teams.map((tm, i) => (
              <div key={tm.id} className={styles.row}>
                <input
                  className={`${styles.input} ${styles.grow}`}
                  aria-label={`${t.teamName} ${i + 1}`}
                  value={tm.name}
                  maxLength={24}
                  onChange={(e) =>
                    setTeams(
                      teams.map((x) => (x.id === tm.id ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <input
                  type="color"
                  className={styles.colorInput}
                  aria-label={`${t.color} : ${tm.name}`}
                  value={tm.color}
                  onChange={(e) =>
                    setTeams(
                      teams.map((x) => (x.id === tm.id ? { ...x, color: e.target.value } : x)),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className={styles.btn}
              onClick={() => setPlayers(assignTeamsBalanced(players, teams))}
            >
              🎲 {t.randomTeams}
            </button>
          </>
        )}
      </section>

      <section className={styles.section} aria-label={t.order}>
        <h2>{t.order}</h2>
        <div className={styles.segment} role="group" aria-label={t.order}>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={order === 'entry'}
            onClick={() => setOrder('entry')}
          >
            {t.orderEntry}
          </button>
          <button
            type="button"
            className={styles.btn}
            aria-pressed={order === 'random'}
            onClick={() => setOrder('random')}
          >
            {t.orderRandom}
          </button>
        </div>
      </section>

      <details className={styles.section}>
        <summary
          style={{ cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center' }}
        >
          🍺 {fr.drinks.summary}
        </summary>
        <DrinksEditor />
      </details>

      <h2 style={{ margin: 0 }}>{t.rules}</h2>
      <p className={styles.hint}>{t.rulesHint}</p>
      <RulesEditor rules={rules} onChange={setRules} showTeamRules={mode === 'teams'} />

      <div className={styles.sticky}>
        {errors.length > 0 && players.length > 0 && (
          <ul className={styles.errors} role="alert" style={{ marginBottom: 8 }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={errors.length > 0 || busy}
          onClick={start}
        >
          {t.start}
        </button>
      </div>
    </main>
  );
}
