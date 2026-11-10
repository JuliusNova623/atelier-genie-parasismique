import { useState, type ReactNode } from 'react';
import styles from '../../components/ui.module.css';
import type { EffectRecord } from '../../engine/effects';
import { stepView, type FlowInput, type FlowState } from '../../engine/flow';
import { getPlayer } from '../../engine/game';
import type { Game } from '../../engine/types';
import { useGameStore } from '../../store/game';
import { drinkLabel, useSettings } from '../../store/settings';
import { PlayerBanner } from './PlayerBanner';

const multText = (m: number): string => (m === 0.5 ? '½ ' : m === 1 ? '' : `${m} × `);

/** Une ligne « X boit … » pour un effet de malus, avec le bouclier / l'alliance éventuels. */
function MalusLine({ game, fx }: { game: Game; fx: EffectRecord }) {
  const drinks = useSettings((s) => s.drinks);
  if (fx.k === 'water') {
    return (
      <li data-effect="water">
        💧 <strong>{getPlayer(game, fx.to).name}</strong> boit un grand verre d&apos;eau
      </li>
    );
  }
  if (fx.k !== 'malus') return null;
  const p = getPlayer(game, fx.to);
  return (
    <li data-effect="malus" data-player={p.id}>
      {p.avatar} <strong>{p.name}</strong> boit {multText(fx.mult)}n°{fx.n} ·{' '}
      {drinkLabel(drinks, fx.n)}
      {p.noAlcohol ? ' (version sans alcool)' : ''}
      {fx.via ? ` — protégé par ${getPlayer(game, fx.via).name}` : ''}
    </li>
  );
}

function DrinkName({ n }: { n: number }) {
  const drinks = useSettings((s) => s.drinks);
  return <h3 style={{ textAlign: 'center', margin: 0 }}>{drinkLabel(drinks, n)}</h3>;
}

function Confirm({
  step,
  title,
  onOk,
  label = 'OK',
  children,
}: {
  step: string;
  title: string;
  onOk: () => void;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.section} data-step={step} aria-live="polite">
      <h2>{title}</h2>
      {children}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        data-confirm
        onClick={onOk}
      >
        {label}
      </button>
    </section>
  );
}

/**
 * Étape en cours d'un effet de carte (choix de joueurs, question, nombre, malus à boire,
 * répartition…). Sert à la fois à la carte jouée et aux fautes / résolutions de règles.
 */
export function FlowPanel({
  game,
  flow,
  onAnswer,
}: {
  game: Game;
  flow: FlowState;
  onAnswer: (input: FlowInput) => void;
}) {
  // L'état local (sélection, répartition) repart de zéro à chaque étape grâce à la clé.
  return (
    <StepPanel key={`${flow.uid}-${flow.index}`} game={game} flow={flow} onAnswer={onAnswer} />
  );
}

function StepPanel({
  game,
  flow,
  onAnswer,
}: {
  game: Game;
  flow: FlowState;
  onAnswer: (input: FlowInput) => void;
}) {
  const view = stepView(game, flow);
  const [sel, setSel] = useState<string[]>([]);
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  if (!view) return null;
  const name = (id: string) => getPlayer(game, id);
  const answer = onAnswer;

  switch (view.kind) {
    case 'pick': {
      const multi = view.count !== 1;
      const need = view.count === 2 ? 2 : undefined;
      const ok = need === undefined || sel.length === need;
      return (
        <section className={styles.section} data-step="pick" aria-label={view.prompt}>
          <h2>{view.prompt}</h2>
          <div className={styles.segment}>
            {view.candidates.map((id) => {
              const p = name(id);
              const on = sel.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={styles.btn}
                  data-choice={id}
                  aria-pressed={multi ? on : undefined}
                  onClick={() =>
                    multi
                      ? setSel(on ? sel.filter((x) => x !== id) : [...sel, id].slice(-(need ?? 99)))
                      : answer({ ids: [id] })
                  }
                >
                  {p.avatar} {p.name}
                </button>
              );
            })}
          </div>
          {multi && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              data-confirm
              disabled={!ok}
              onClick={() => answer({ ids: sel })}
            >
              {view.count === 'any' && sel.length === 0 ? 'Personne' : `Valider (${sel.length})`}
            </button>
          )}
        </section>
      );
    }
    case 'ask':
      return (
        <section className={styles.section} data-step="ask" aria-label={view.prompt}>
          <h2>{view.prompt}</h2>
          <div className={styles.bigActions}>
            {view.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={styles.btn}
                data-choice={o.id}
                onClick={() => answer({ id: o.id })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      );
    case 'number':
      return (
        <section className={styles.section} data-step="number" aria-label={view.prompt}>
          <h2>{view.prompt}</h2>
          <div className={styles.segment}>
            {Array.from({ length: view.max - view.min + 1 }, (_, i) => view.min + i).map((v) => (
              <button
                key={v}
                type="button"
                className={styles.btn}
                data-choice={v}
                onClick={() => answer({ value: v })}
              >
                {v}
              </button>
            ))}
          </div>
        </section>
      );
    case 'draw':
      return (
        <Confirm step="draw" title={view.prompt} onOk={() => answer({})}>
          <div className={styles.shotNum} aria-hidden="true">
            {view.n}
          </div>
          <DrinkName n={view.n} />
        </Confirm>
      );
    case 'malus':
      return (
        <Confirm step="malus" title={view.prompt} onOk={() => answer({})} label="J'ai bu">
          <div className={styles.shotNum} aria-hidden="true">
            {view.n}
          </div>
          <DrinkName n={view.n} />
          <ul style={{ textAlign: 'left' }}>
            {view.effects.map((fx, i) => (
              <MalusLine key={i} game={game} fx={fx} />
            ))}
          </ul>
        </Confirm>
      );
    case 'water':
      return (
        <Confirm step="water" title={view.prompt} onOk={() => answer({})}>
          <ul>
            {view.to.map((id) => (
              <MalusLine key={id} game={game} fx={{ k: 'water', to: id }} />
            ))}
          </ul>
        </Confirm>
      );
    case 'info':
      return <Confirm step="info" title={view.text} onOk={() => answer({})} />;
    case 'distribute': {
      const total = Object.values(alloc).reduce((a, b) => a + b, 0);
      const by = view.by ? name(view.by) : null;
      return (
        <section className={styles.section} data-step="distribute" aria-label={view.prompt}>
          <h2>
            {by ? `${by.avatar} ${by.name} : ` : ''}
            {view.prompt}
          </h2>
          <div className={styles.shotNum} aria-hidden="true">
            {view.n}
          </div>
          <DrinkName n={view.n} />
          <p className={styles.hint}>
            {total} / {view.portions} portion{view.portions > 1 ? 's' : ''} répartie
            {view.portions > 1 ? 's' : ''}
          </p>
          <ul className={styles.segment} style={{ listStyle: 'none', padding: 0 }}>
            {game.players.map((p) => (
              <li key={p.id} data-player={p.id}>
                {p.avatar} {p.name}{' '}
                <button
                  type="button"
                  className={styles.btn}
                  aria-label={`Moins pour ${p.name}`}
                  disabled={!alloc[p.id]}
                  onClick={() => setAlloc({ ...alloc, [p.id]: (alloc[p.id] ?? 0) - 1 })}
                >
                  −
                </button>
                <strong aria-live="polite"> {alloc[p.id] ?? 0} </strong>
                <button
                  type="button"
                  className={styles.btn}
                  aria-label={`Plus pour ${p.name}`}
                  disabled={total >= view.portions}
                  onClick={() => setAlloc({ ...alloc, [p.id]: (alloc[p.id] ?? 0) + 1 })}
                >
                  +
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            data-confirm
            disabled={total !== view.portions}
            onClick={() => answer({ alloc })}
          >
            Distribuer
          </button>
        </section>
      );
    }
    case 'cancel-rule':
      return (
        <section className={styles.section} data-step="cancel-rule">
          <h2>{view.prompt}</h2>
          <div className={styles.bigActions}>
            {view.rules.map((r) => (
              <button
                key={r.id}
                type="button"
                className={styles.btn}
                data-choice={r.id}
                onClick={() => answer({ ruleId: r.id })}
              >
                {r.text}
              </button>
            ))}
          </div>
        </section>
      );
  }
}

/** Écran d'une carte à effet : la carte reste visible, les étapes s'enchaînent dessous. */
export function FlowScreen({ game }: { game: Game }) {
  const answerFlow = useGameStore((s) => s.answerFlow);
  const p = game.pending!;
  const flow = p.flow!;
  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <div className={styles.cardStage}>
        <div className={styles.qcard}>
          <p style={{ margin: 0 }}>{flow.title}</p>
        </div>
        <h1 className={styles.qmeta}>Carte n°{p.cardNumber}</h1>
      </div>
      <FlowPanel game={game} flow={flow} onAnswer={(i) => void answerFlow(i)} />
    </main>
  );
}
