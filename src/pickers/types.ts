import type { PickerMode } from '../engine/types';

/**
 * Interface commune des modes de tirage du numéro.
 *
 * Le numéro (`target`) est calculé par le moteur AVANT l'animation. Le sélecteur ne fait que :
 *  1. appeler `onTrigger()` quand le joueur agit (tap, swipe, secousse, carte touchée…) ;
 *  2. recevoir `target` en retour (le parent fixe le résultat) puis jouer l'animation ;
 *  3. appeler `onDone(target)` à la fin.
 * Si `target` est déjà défini au montage (reprise après fermeture de l'app), l'animation démarre seule.
 * Pour ajouter un mode : créer un composant `NumberPickerProps` et l'enregistrer dans `PICKERS`.
 */
export interface NumberPickerProps {
  /** Plus grand numéro (1..max). */
  max: number;
  /** Numéros non tirables (déjà joués) : affichés « grillés » quand le mode s'y prête. */
  excluded: number[];
  /** Résultat déjà tiré, ou null tant que le joueur n'a pas déclenché le tirage. */
  target: number | null;
  onTrigger: () => void;
  onDone: (n: number) => void;
  /** prefers-reduced-motion : animations raccourcies. */
  reduced: boolean;
}

export type { PickerMode };
