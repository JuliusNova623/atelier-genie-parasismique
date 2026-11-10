import type { Player } from './types';
import {
  assignTeamsBalanced,
  buildTurnOrder,
  makePlayer,
  makeTeams,
  validatePlayers,
  validateTeams,
} from './setup';

const players = (n: number) => Array.from({ length: n }, (_, i) => makePlayer(i, `J${i + 1}`));

describe('validatePlayers', () => {
  it('accepte 2 à 20 joueurs aux noms uniques', () => {
    expect(validatePlayers(players(2))).toEqual([]);
    expect(validatePlayers(players(20))).toEqual([]);
  });

  it('refuse moins de 2 et plus de 20 joueurs', () => {
    expect(validatePlayers(players(1))).toHaveLength(1);
    expect(validatePlayers(players(21))[0]).toContain('Maximum 20');
  });

  it('refuse les noms vides et les doublons (insensible à la casse)', () => {
    const p = players(3);
    p[1].name = '  ';
    expect(validatePlayers(p).join()).toContain('un nom');
    p[1].name = 'j1';
    expect(validatePlayers(p).join()).toContain('plusieurs fois');
  });

  it('donne une couleur et un avatar distincts aux 20 premiers joueurs', () => {
    const p = players(20);
    expect(new Set(p.map((x) => x.color)).size).toBe(20);
    expect(new Set(p.map((x) => x.avatar)).size).toBe(20);
  });
});

describe('équipes', () => {
  it('répartit au hasard de façon équilibrée', () => {
    for (let run = 0; run < 50; run++) {
      const teams = makeTeams(3);
      const assigned = assignTeamsBalanced(players(10), teams);
      const sizes = teams.map((t) => assigned.filter((p) => p.teamId === t.id).length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(10);
      expect(validateTeams(assigned, teams)).toEqual([]);
    }
  });

  it('signale une équipe vide ou un joueur sans équipe', () => {
    const teams = makeTeams(2);
    const p: Player[] = players(3).map((x) => ({ ...x, teamId: teams[0].id }));
    expect(validateTeams(p, teams).join()).toContain('aucun joueur');
    p[0].teamId = undefined;
    expect(validateTeams(p, teams).join()).toContain('appartenir');
  });

  it('conserve noms et couleurs en changeant le nombre d’équipes', () => {
    const t = makeTeams(2);
    t[0].name = 'Les rouges';
    const t3 = makeTeams(3, t);
    expect(t3[0].name).toBe('Les rouges');
    expect(t3).toHaveLength(3);
  });
});

describe('ordre de passage', () => {
  it('garde l’ordre de saisie', () => {
    const p = players(5);
    expect(buildTurnOrder(p, 'entry')).toEqual(p.map((x) => x.id));
  });

  it('tire une permutation valide', () => {
    const p = players(8);
    const order = buildTurnOrder(p, 'random');
    expect([...order].sort()).toEqual(p.map((x) => x.id).sort());
  });
});
