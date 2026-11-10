import { PickerPanel } from '../../components/PickerPanel';
import styles from '../../components/ui.module.css';
import { getPlayer } from '../../engine/game';
import { cardPlayerId, drinkCountOf } from '../../engine/turn';
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
  const count = drinkCountOf(game);

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

      {!shown && (
        <section className={styles.section} aria-label={t.pick(count)}>
          <h2>{t.pick(count)}</h2>
          <PickerPanel
            game={game}
            max={count}
            excluded={[]}
            target={target}
            onTrigger={() => void spinDrink()}
            stepKey={`drink-${game.log.length}`}
          />
        </section>
      )}

      {shown && (
        <>
          <section className={styles.section} aria-live="assertive" role="status">
            <p className={styles.shotLabel}>{t.yourDrink}</p>
            <div className={styles.shotNum} aria-hidden="true">
              {target}
            </div>
            <h2 style={{ fontSize: '1.2rem', textAlign: 'center' }}>
              {t.drinkIs(target, drinkLabel(drinks, target))}
            </h2>
            {player.noAlcohol && <p style={{ margin: 0, fontWeight: 700 }}>{t.noAlcoholVersion}</p>}
            {drink?.noAlcohol && <p className={styles.hint}>{t.drinkIsNoAlcohol}</p>}
          </section>
          <div className={styles.bigActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void resolveDrink()}
            >
              {t.drank} ({fr.play.points(game.rules.pointsDrinkDrunk)})
            </button>
          </div>
        </>
      )}
    </main>
  );
}
