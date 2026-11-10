import { Navigate } from 'react-router-dom';
import { useGameStore } from '../store/game';
import { CardScreen } from './play/CardScreen';
import { DrinkScreen } from './play/DrinkScreen';
import { ThemeScreen } from './play/ThemeScreen';
import { WheelScreen } from './play/WheelScreen';

/**
 * L'écran affiché est dérivé de l'état de la partie (source de vérité), pas de l'historique du
 * navigateur : le bouton retour ne peut pas casser un tour, et la reprise revient à la bonne étape.
 */
export function Play() {
  const game = useGameStore((s) => s.game);
  if (!game) return <Navigate to="/" replace />;

  const p = game.pending;
  const turn = game.log.length;
  if (!p || (p.stage === 'theme' && !p.revealed)) {
    return <WheelScreen key={`wheel-${turn}`} game={game} />;
  }
  if (p.stage === 'drink') return <DrinkScreen key={`drink-${turn}`} game={game} />;
  if (p.stage === 'card' && p.revealed) return <CardScreen key={`card-${turn}`} game={game} />;
  return <ThemeScreen key={`theme-${turn}`} game={game} />;
}
