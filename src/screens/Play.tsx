import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { setKeepAwake } from '../util/native';
import { CardScreen } from './play/CardScreen';
import { DrinkScreen } from './play/DrinkScreen';
import { FlowScreen } from './play/FlowScreen';
import { RulesPanel } from './play/RulesPanel';
import { deriveEffects } from '../engine/effects';
import { PlayShell } from './play/PlayShell';
import { ThemeScreen } from './play/ThemeScreen';
import { WheelScreen } from './play/WheelScreen';
import { screenOf, usePlayHotkeys } from './play/useHotkeys';

/**
 * L'écran affiché est dérivé de l'état de la partie (source de vérité), pas de l'historique du
 * navigateur : le bouton retour ne peut pas casser un tour, et la reprise revient à la bonne étape.
 */
export function Play() {
  const game = useGameStore((s) => s.game);
  const keepAwake = useSettings((s) => s.keepAwake);
  const running = !!game;

  // Écran allumé pendant la partie (réglable) ; relâché en quittant l'écran de jeu.
  useEffect(() => {
    if (!keepAwake || !running) return;
    void setKeepAwake(true);
    return () => void setKeepAwake(false);
  }, [keepAwake, running]);

  usePlayHotkeys(game);

  // Une règle arrivée à échéance avec des étapes de résolution s'ouvre toute seule entre deux tours.
  const interlude = useGameStore((s) => s.interlude);
  const dueId =
    game && !game.pending && !interlude
      ? deriveEffects(game).rules.find((r) => r.due)?.id
      : undefined;
  useEffect(() => {
    if (dueId) useGameStore.getState().startResolution(dueId);
  }, [dueId]);

  if (!game) return <Navigate to="/" replace />;

  const screen = screenOf(game);
  const turn = game.log.length;
  const view =
    screen === 'wheel' ? (
      <>
        <WheelScreen key={`wheel-${turn}`} game={game} />
        <RulesPanel game={game} />
      </>
    ) : screen === 'flow' ? (
      <FlowScreen key={`flow-${turn}`} game={game} />
    ) : screen === 'drink' ? (
      <DrinkScreen key={`drink-${turn}`} game={game} />
    ) : screen === 'card' ? (
      <CardScreen key={`card-${turn}`} game={game} />
    ) : (
      <ThemeScreen key={`theme-${turn}`} game={game} />
    );

  return (
    <PlayShell game={game} screen={screen}>
      {view}
    </PlayShell>
  );
}
