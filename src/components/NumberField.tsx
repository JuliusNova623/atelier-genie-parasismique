import { useId } from 'react';
import styles from './ui.module.css';

interface Props {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Si vrai, un champ vide donne null. Sinon 0. */
  nullable?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function NumberField({ label, value, onChange, nullable, min, max, disabled }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? (nullable ? null : 0) : Number(v));
        }}
      />
    </div>
  );
}
