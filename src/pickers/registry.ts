import type { ComponentType } from 'react';
import type { PickerMode } from '../engine/types';
import { AutoPick } from './AutoPick';
import { Dice } from './Dice';
import { FaceDownCards } from './FaceDownCards';
import { Shake } from './Shake';
import { SlotMachine } from './SlotMachine';
import type { NumberPickerProps } from './types';

/** Ajouter un mode = créer un composant `NumberPickerProps` et l'ajouter ici (et à PickerMode). */
export const PICKERS: Record<PickerMode, ComponentType<NumberPickerProps>> = {
  auto: AutoPick,
  dice: Dice,
  shake: Shake,
  cards: FaceDownCards,
  slot: SlotMachine,
};

export const PICKER_LABELS: Record<PickerMode, string> = {
  auto: '⚡ Direct',
  dice: '🎲 Dé',
  shake: '📱 Secouer',
  cards: '🃏 Cartes',
  slot: '🎰 Machine',
};

export const PICKER_ORDER: PickerMode[] = ['auto', 'dice', 'shake', 'cards', 'slot'];
