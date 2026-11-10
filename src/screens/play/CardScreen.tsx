import { useState } from 'react';
import { CardTimer } from '../../components/CardTimer';
import styles from '../../components/ui.module.css';
import { currentPlayerId, getPlayer, remainingJokers } from '../../engine/game';
import { cardPlayerId, duelAvailable } from '../../engine/turn';
import type { Game, JokerType } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { useContent } from '../../store/content';
import { useGameStore } from '../../store/game';
import { PlayerBanner } from './PlayerBanner';

const JOKERS: JokerType[] = ['pass', 'double', 'transfer'];
const HINTS = {
  pass: fr.play.jokers.passHint,
  double: fr.play.jokers.doubleHint,
  transfer: fr.play.jokers.transferHint,
};

/**
 * Page de carte : faire / refuser, jokers (Passe, Double, Transfert), chronomètre éventuel,
 * et règles d'équipe optionnelles (l'adversaire décide, duel).
 */
export function CardScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const store = useGameStore.getState();
  const [choosing, setChoosing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [duelPanel, setDuelPanel] = useState<null | { first: string | null }>(null);

  const p = game.pending!;
  const theme = content.themes.find((t) => t.id === p.themeId);
  const card = theme?.cards.find((c) => c.number === p.cardNumber);
  const owner = getPlayer(game, currentPlayerId(game));
  const player = getPlayer(game, cardPlayerId(game));
  const decider = p.deciderId ? getPlayer(game, p.deciderId) : null;
  const left = remainingJokers(game, owner.id);
  const anyJoker = JOKERS.some((j) => game.rules.jokers[j].enabled);
  const base = card?.points ?? game.rules.pointsCard;
  const gain = p.joker === 'double' ? base * 2 : base;
  const isAction = card?.type === 'action';
  const doLabel = decider ? fr.play.team.mustDo : isAction ? fr.play.doIt : fr.play.answerIt;
  const refuseLabel = decider ? fr.play.team.mustDrink : fr.play.refuse;
  const canDuel = duelAvailable(game) && !p.joker && !p.duel;

  const toggleJoker = (j: 'double' | 'transfer') => {
    if (p.joker === j) {
      setChoosing(false);
      void store.disarmJoker();
    } else if (j === 'transfer') {
      setChoosing((c) => !c);
    } else {
      void store.armJoker('double');
    }
  };

  const duelists = p.duel ? [getPlayer(game, p.duel.a), getPlayer(game, p.duel.b)] : [];
  const teamName = (id?: string) => game.teams.find((t) => t.id === id)?.name ?? '';

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <div className={styles.cardStage} aria-live="polite">
        <span className={styles.themeBadge} style={{ background: theme?.color }}>
          <span aria-hidden="true">{theme?.emoji}</span> {theme?.name}
        </span>
        <p className={`${styles.typeTag} ${isAction ? styles.dare : styles.truth}`}>
          • {isAction ? fr.play.action : fr.play.question} •
        </p>
        <div className={styles.qcard}>
          <p style={{ margin: 0 }}>{card?.text}</p>
          {card?.answer &&
            (showAnswer ? (
              <p className={styles.answer} role="status">
                💡 {fr.play.answer.label} <strong>{card.answer}</strong>
              </p>
            ) : (
              <button type="button" className={styles.btn} onClick={() => setShowAnswer(true)}>
                {fr.play.answer.show}
              </button>
            ))}
          {card?.timer ? <CardTimer seconds={card.timer} /> : null}
        </div>
        <h1 className={styles.qmeta}>{fr.play.cardTitle(p.cardNumber ?? 0)}</h1>
      </div>

      {p.transferTo && (
        <p className={styles.notice} role="status">
          🔁 {fr.play.jokers.transferredTo(owner.name, player.name)}
        </p>
      )}

      {decider && !p.duel && (
        <p className={styles.notice} role="status">
          🎭 {fr.play.team.decides(decider.name, player.name)}
        </p>
      )}

      {p.duel ? (
        <section className={styles.section} aria-label={fr.play.team.duelTitle}>
          <h2>
            ⚔️ {fr.play.team.duelTitle} : {fr.play.team.duelVs(duelists[0].name, duelists[1].name)}
          </h2>
          <p className={styles.hint}>{fr.play.team.duelHint}</p>
          <div className={styles.bigActions}>
            {duelists.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => void store.finishDuel(d.id)}
              >
                {d.avatar} {fr.play.team.duelWins(d.name)} ({fr.play.points(base)} ·{' '}
                {teamName(d.teamId)})
              </button>
            ))}
            <button type="button" className={styles.btn} onClick={() => void store.cancelDuel()}>
              {fr.play.team.duelCancel}
            </button>
          </div>
        </section>
      ) : (
        <div className={styles.bigActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void store.completeCard()}
          >
            {doLabel} ({fr.play.points(gain)}){p.transferTo ? ` · ${player.name}` : ''}
          </button>
          <button type="button" className={styles.btn} onClick={() => void store.refuseCard()}>
            {refuseLabel}
          </button>
        </div>
      )}

      {canDuel && (
        <section className={styles.section} aria-label={fr.play.team.duelTitle}>
          {!duelPanel ? (
            <button
              type="button"
              className={styles.btn}
              onClick={() => setDuelPanel({ first: null })}
            >
              ⚔️ {fr.play.team.duelStart}
            </button>
          ) : (
            <div role="group" aria-label={fr.play.team.duelTitle}>
              <p className={styles.hint}>
                {duelPanel.first ? fr.play.team.duelSecond : fr.play.team.duelFirst}
              </p>
              <div className={styles.segment}>
                {game.players
                  .filter((x) => {
                    if (!duelPanel.first) return true;
                    return x.teamId !== getPlayer(game, duelPanel.first).teamId;
                  })
                  .map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={styles.btn}
                      onClick={() => {
                        if (!duelPanel.first) {
                          setDuelPanel({ first: x.id });
                        } else {
                          void store.startDuel(duelPanel.first, x.id);
                          setDuelPanel(null);
                        }
                      }}
                    >
                      {x.avatar} {x.name}
                      <small> · {teamName(x.teamId)}</small>
                    </button>
                  ))}
              </div>
              <button
                type="button"
                className={styles.btn}
                style={{ marginTop: 8 }}
                onClick={() => setDuelPanel(null)}
              >
                {fr.common.cancel}
              </button>
            </div>
          )}
        </section>
      )}

      {anyJoker && !p.duel && (
        <section className={styles.section} aria-label={fr.play.jokers.title}>
          <h2>
            {fr.play.jokers.title}
            {game.rules.teamRules.sharedJokers && game.mode === 'teams'
              ? ` · ${fr.play.team.sharedPool}`
              : ''}
          </h2>
          <div className={styles.jokerBar}>
            {JOKERS.map((j) => {
              const armed = p.joker === j;
              const exhausted = left[j] < 1;
              const blocked = j === 'pass' ? !!p.joker : !!p.joker && !armed;
              return (
                <button
                  key={j}
                  type="button"
                  aria-pressed={j === 'pass' ? undefined : armed}
                  disabled={(exhausted && !armed) || blocked || !game.rules.jokers[j].enabled}
                  title={HINTS[j]}
                  onClick={() => (j === 'pass' ? void store.playPass() : toggleJoker(j))}
                >
                  <span>{fr.play.jokers[j]}</span>
                  <small>{armed ? fr.play.jokers.armed : fr.play.jokers.left(left[j])}</small>
                </button>
              );
            })}
          </div>
          {choosing && !p.joker && (
            <div role="group" aria-label={fr.play.jokers.chooseTarget}>
              <p className={styles.hint}>{fr.play.jokers.chooseTarget}</p>
              <div className={styles.segment}>
                {game.players
                  .filter((x) => x.id !== owner.id)
                  .map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={styles.btn}
                      onClick={() => {
                        setChoosing(false);
                        void store.armJoker('transfer', x.id);
                      }}
                    >
                      {x.avatar} {x.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
