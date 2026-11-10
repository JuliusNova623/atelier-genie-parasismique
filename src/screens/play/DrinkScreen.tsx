import { PickerPanel } from '../../components/PickerPanel';
import styles from '../../components/ui.module.css';
import { getPlayer } from '../../engine/game';
import { DRINK_COUNT, cardPlayerId } from '../../engine/turn';
import type { Game } from '../../engine/types';
import { fr } from '../../i18n/fr';
import { useGameStore } from '../../store/game';
import { drinkLabel, useSettings } from '../../store/settings';
import { PlayerBanner } from './PlayerBanner';

/** Étape boisson : le numéro tiré (avec remise) désigne la boisson ; J'ai bu / Je ne bois pas. */
export function DrinkScreen({ game }: { game: Game }) {
  const drinks = useSettings((s) => s.drinks);
  const spinDrink = useGameStore((s) => s.spinDrink);
  const resolveDrink = useGameStore((s) => s.resolveDrink);

  const p = game.pending!;
  const player = getPlayer(game, cardPlayerId(game));
  const target = p.drinkNumber ?? null;
  const shown = p.revealed && target !== null;
  const drink = target !== null ? drinks.find((d) => d.number === target) : undefined;
  const t = fr.play.drink;

  return (
    <main className={styles.screen}>
      <PlayerBanner game={game} />
      <section className={styles.section} aria-label={t.title}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{t.title}</h1>
        <p className={styles.hint}>
          {t.refusedCard(p.cardNumber ?? 0)}
          {p.transferTo ? ` · ${player.name}` : ''}
        </p>
      </section>

      <section className={styles.section} aria-label={t.pick}>
        <h2>{t.pick}</h2>
        <PickerPanel
          game={game}
          max={DRINK_COUNT}
          excluded={[]}
          target={target}
          onTrigger={() => void spinDrink()}
          stepKey={`drink-${game.log.length}`}
        />
      </section>

      {shown && (
        <>
          <section className={styles.section} aria-live="assertive" role="status">
            <h2 style={{ fontSize: '1.4rem' }}>{t.drinkIs(target, drinkLabel(drinks, target))}</h2>
            {player.noAlcohol && <p style={{ margin: 0, fontWeight: 700 }}>{t.noAlcoholVersion}</p>}
            {drink?.noAlcohol && <p className={styles.hint}>{t.drinkIsNoAlcohol}</p>}
          </section>
          <div className={styles.bigActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void resolveDrink(true)}
            >
              {t.drank} ({fr.play.points(game.rules.pointsDrinkDrunk)})
            </button>
            <button type="button" className={styles.btn} onClick={() => void resolveDrink(false)}>
              {t.refused} ({fr.play.points(game.rules.pointsDrinkRefused)})
            </button>
          </div>
        </>
      )}
    </main>
  );
}
