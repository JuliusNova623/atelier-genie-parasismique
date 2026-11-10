import { useState } from 'react';
import { CardTimer } from '../../components/CardTimer';
import styles from '../../components/ui.module.css';
import { currentPlayerId, getPlayer, remainingJokers } from '../../engine/game';
import { cardPlayerId } from '../../engine/turn';
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

/** Page de carte : faire / refuser, jokers (Passe, Double, Transfert) et chronomètre éventuel. */
export function CardScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const { completeCard, refuseCard, playPass, armJoker, disarmJoker } = useGameStore.getState();
  const [choosing, setChoosing] = useState(false);

  const p = game.pending!;
  const theme = content.themes.find((t) => t.id === p.themeId);
  const card = theme?.cards.find((c) => c.number === p.cardNumber);
  const owner = getPlayer(game, currentPlayerId(game));
  const player = getPlayer(game, cardPlayerId(game));
  const left = remainingJokers(game, owner.id);
  const anyJoker = JOKERS.some((j) => game.rules.jokers[j].enabled);
  const base = card?.points ?? game.rules.pointsCard;
  const gain = p.joker === 'double' ? base * 2 : base;
  const isAction = card?.type === 'action';

  const toggleJoker = (j: 'double' | 'transfer') => {
    if (p.joker === j) {
      setChoosing(false);
      void disarmJoker();
    } else if (j === 'transfer') {
      setChoosing((c) => !c);
    } else {
      void armJoker('double');
    }
  };

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <section className={styles.section} style={{ borderColor: theme?.color }} aria-live="polite">
        <p className={styles.hint}>
          {theme?.emoji} {theme?.name}
        </p>
        <h1 style={{ margin: 0 }}>{fr.play.cardTitle(p.cardNumber ?? 0)}</h1>
        <p className={styles.hint}>{isAction ? fr.play.action : fr.play.question}</p>
        <p style={{ fontSize: '1.25rem', margin: 0, overflowWrap: 'anywhere' }}>{card?.text}</p>
        {card?.timer ? <CardTimer seconds={card.timer} /> : null}
      </section>

      {p.transferTo && (
        <p className={styles.notice} role="status">
          🔁 {fr.play.jokers.transferredTo(owner.name, player.name)}
        </p>
      )}

      <div className={styles.bigActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => void completeCard()}
        >
          {isAction ? fr.play.doIt : fr.play.answerIt} ({fr.play.points(gain)})
          {p.transferTo ? ` · ${player.name}` : ''}
        </button>
        <button type="button" className={styles.btn} onClick={() => void refuseCard()}>
          {fr.play.refuse}
        </button>
      </div>

      {anyJoker && (
        <section className={styles.section} aria-label={fr.play.jokers.title}>
          <h2>{fr.play.jokers.title}</h2>
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
                  onClick={() => (j === 'pass' ? void playPass() : toggleJoker(j))}
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
                        void armJoker('transfer', x.id);
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
