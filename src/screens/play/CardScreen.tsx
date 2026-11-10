import styles from '../../components/ui.module.css';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { useContent } from '../../store/content';
import { useGameStore } from '../../store/game';
import { PlayerBanner } from './PlayerBanner';

/** Page de carte PROVISOIRE (étape 5) : affiche la carte tirée. Faire/refuser/jokers : étape 6. */
export function CardScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const complete = useGameStore((s) => s.completeCardTemp);
  const p = game.pending!;
  const theme = content.themes.find((t) => t.id === p.themeId);
  const card = theme?.cards.find((c) => c.number === p.cardNumber);

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <section className={styles.section} style={{ borderColor: theme?.color }} aria-live="polite">
        <p className={styles.hint}>
          {theme?.emoji} {theme?.name}
        </p>
        <h1 style={{ margin: 0 }}>{fr.play.cardTitle(p.cardNumber ?? 0)}</h1>
        <p className={styles.hint}>{card?.type === 'action' ? fr.play.action : fr.play.question}</p>
        <p style={{ fontSize: '1.25rem', margin: 0 }}>{card?.text}</p>
        {card?.timer && <p className={styles.hint}>{fr.play.timerLabel(card.timer)}</p>}
      </section>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        style={{ minHeight: 56 }}
        onClick={() => void complete()}
      >
        {fr.play.validateTemp}
      </button>
    </main>
  );
}
