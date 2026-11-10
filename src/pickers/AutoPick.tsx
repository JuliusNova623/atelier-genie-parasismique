import { useEffect, useRef } from 'react';
import { SlotMachine } from './SlotMachine';
import type { NumberPickerProps } from './types';

/**
 * Tirage « Direct » : aucune manipulation. Le tirage se déclenche dès l'affichage, et les chiffres
 * défilent jusqu'au numéro (déjà tiré par le moteur). Idéal pour jouer à l'écran, sans toucher au téléphone.
 */
export function AutoPick(props: NumberPickerProps) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || props.target !== null) return;
    started.current = true;
    props.onTrigger();
  }, [props]);

  return <SlotMachine {...props} onTrigger={() => undefined} fast />;
}
