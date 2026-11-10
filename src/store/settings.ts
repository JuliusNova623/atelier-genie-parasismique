import { create } from 'zustand';
import { repo } from '../db/repo';
import type { DrinkRow } from '../db/db';
import { DEFAULT_RULES, type Rules } from '../engine/types';
import { applyStatusBar } from '../util/native';

export type VisualTheme = 'neon' | 'arcade' | 'sober' | 'pastel';
export const VISUAL_THEMES: VisualTheme[] = ['neon', 'arcade', 'sober', 'pastel'];

export interface Prefs {
  visualTheme: VisualTheme;
  sound: boolean;
  haptics: boolean;
  keepAwake: boolean;
  /** Nombre de boissons utilisées par les prochaines parties (1 à 20). */
  drinkCount: number;
  defaultRules: Rules;
}

export const DEFAULT_PREFS: Prefs = {
  visualTheme: 'neon',
  sound: true,
  haptics: true,
  keepAwake: true,
  drinkCount: 20,
  defaultRules: DEFAULT_RULES,
};

const blankDrinks = (): DrinkRow[] =>
  Array.from({ length: 20 }, (_, i) => ({ number: i + 1, name: '', noAlcohol: false }));

/** Fusionne des préférences enregistrées (éventuellement anciennes) avec les valeurs par défaut. */
export function mergePrefs(saved: Partial<Prefs> | undefined): Prefs {
  const r = saved?.defaultRules;
  return {
    ...DEFAULT_PREFS,
    ...saved,
    drinkCount: clampDrinkCount(saved?.drinkCount),
    defaultRules: {
      ...DEFAULT_RULES,
      ...r,
      jokers: { ...DEFAULT_RULES.jokers, ...r?.jokers },
      end: { ...DEFAULT_RULES.end, ...r?.end },
      teamRules: { ...DEFAULT_RULES.teamRules, ...r?.teamRules },
    },
  };
}

export const clampDrinkCount = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(20, Math.max(1, Math.trunc(n))) : 20;

export function applyVisualTheme(theme: VisualTheme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
  void applyStatusBar(theme);
}

const PREFS_KEY = 'prefs';

interface SettingsState extends Prefs {
  drinks: DrinkRow[];
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Prefs>) => Promise<void>;
  setDrinks: (drinks: DrinkRow[]) => Promise<void>;
}

const prefsOf = (s: Prefs): Prefs => ({
  visualTheme: s.visualTheme,
  sound: s.sound,
  haptics: s.haptics,
  keepAwake: s.keepAwake,
  drinkCount: s.drinkCount,
  defaultRules: s.defaultRules,
});

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_PREFS,
  drinks: blankDrinks(),
  loaded: false,
  async load() {
    const saved = await repo.getSetting<Partial<Prefs> | undefined>(PREFS_KEY, undefined);
    const prefs = mergePrefs(saved);
    const drinks = await repo.getDrinks();
    applyVisualTheme(prefs.visualTheme);
    set({ ...prefs, drinks, loaded: true });
  },
  async update(patch) {
    set(patch);
    const prefs = prefsOf(get());
    applyVisualTheme(prefs.visualTheme);
    await repo.setSetting(PREFS_KEY, prefs);
  },
  async setDrinks(drinks) {
    set({ drinks });
    await repo.saveDrinks(drinks);
  },
}));

/** Nom affiché d'une boisson : « Boisson n°X » si le nom est vide. */
export function drinkLabel(drinks: DrinkRow[], number: number): string {
  const name = drinks.find((d) => d.number === number)?.name.trim();
  return name || `Boisson n°${number}`;
}
