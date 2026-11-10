import 'fake-indexeddb/auto';
import { DEFAULT_RULES } from '../engine/types';
import { DEFAULT_PREFS, drinkLabel, mergePrefs, useSettings } from './settings';

describe('mergePrefs', () => {
  it('renvoie les valeurs par défaut sans sauvegarde', () => {
    expect(mergePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });

  it('complète une ancienne sauvegarde partielle', () => {
    const merged = mergePrefs({
      visualTheme: 'arcade',
      defaultRules: {
        ...DEFAULT_RULES,
        pointsCard: 5,
        jokers: { pass: { enabled: false, count: 2 } },
      } as never,
    });
    expect(merged.visualTheme).toBe('arcade');
    expect(merged.defaultRules.pointsCard).toBe(5);
    expect(merged.defaultRules.jokers.pass).toEqual({ enabled: false, count: 2 });
    expect(merged.defaultRules.jokers.double).toEqual(DEFAULT_RULES.jokers.double);
    expect(merged.defaultRules.teamRules.duel).toBe(false);
  });
});

describe('useSettings', () => {
  it('charge les défauts, applique et conserve le thème visuel', async () => {
    await useSettings.getState().load();
    expect(useSettings.getState().visualTheme).toBe('neon');
    expect(document.documentElement.dataset.theme).toBe('neon');
    expect(useSettings.getState().drinks).toHaveLength(20);

    await useSettings.getState().update({ visualTheme: 'pastel', sound: false });
    expect(document.documentElement.dataset.theme).toBe('pastel');

    // Rechargement à froid : l'état revient depuis IndexedDB.
    useSettings.setState({ visualTheme: 'neon', sound: true });
    await useSettings.getState().load();
    expect(useSettings.getState().visualTheme).toBe('pastel');
    expect(useSettings.getState().sound).toBe(false);
  });

  it('conserve les noms de boissons et affiche « Boisson n°X » si vide', async () => {
    await useSettings.getState().load();
    const drinks = useSettings
      .getState()
      .drinks.map((d) => (d.number === 3 ? { ...d, name: 'Mojito' } : d));
    await useSettings.getState().setDrinks(drinks);
    useSettings.setState({ drinks: [] });
    await useSettings.getState().load();
    const d = useSettings.getState().drinks;
    expect(drinkLabel(d, 3)).toBe('Mojito');
    expect(drinkLabel(d, 4)).toBe('Boisson n°4');
  });
});
