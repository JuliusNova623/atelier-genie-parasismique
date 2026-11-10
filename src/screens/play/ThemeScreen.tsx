import styles from '../../components/ui.module.css';
import { PickerPanel } from '../../components/PickerPanel';
import { remainingCards } from '../../engine/game';
import { playedCards } from '../../engine/turn';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { useContent } from '../../store/content';
import { useGameStore } from '../../store/game';
import { PlayerBanner } from './PlayerBanner';

/** Page du thème : choix du mode de tirage puis du numéro de carte (1 à 20). */
export function ThemeScreen({ game }: { game: Game }) {
  const content = useContent((s) => s.content);
  const spinCard = useGameStore((s) => s.spinCard);

  const pending = game.pending!;
  const theme = content.themes.find((t) => t.id === pending.themeId);
  const left = remainingCards(game, pending.themeId).length;
  const played = playedCards(game, pending.themeId);
  const max = Math.max(...(game.themeCards[pending.themeId] ?? [20]));
  const target = pending.stage === 'card' ? (pending.cardNumber ?? null) : null;

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <section
        className={styles.section}
        style={{ borderColor: theme?.color }}
        aria-label={theme?.name}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          <span aria-hidden="true">{theme?.emoji}</span> {theme?.name}
        </h1>
        {theme?.description && <p className={styles.hint}>{theme.description}</p>}
        <p role="status" style={{ margin: 0 }}>
          {fr.play.remaining(left)}
          {left === 1 && <strong> — {fr.play.lastCard}</strong>}
        </p>
      </section>

      <section className={styles.section} aria-label={fr.play.pickNumber}>
        <h2>{fr.play.pickNumber}</h2>
        <PickerPanel
          game={game}
          max={max}
          excluded={played}
          target={target}
          onTrigger={() => void spinCard()}
          stepKey={`card-${game.log.length}`}
          showPlayed
        />
      </section>
    </main>
  );
}
