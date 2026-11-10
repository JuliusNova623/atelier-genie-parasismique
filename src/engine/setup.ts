import { newId } from './id';
import { shuffle, type Uint32Source } from './rng';
import type { Player, Team } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 20;

export const PLAYER_COLORS = [
  '#ff2fb3',
  '#20e3ff',
  '#a855f7',
  '#ffb020',
  '#22d36b',
  '#ff5c5c',
  '#4f8cff',
  '#f472b6',
  '#c6f432',
  '#ff7a1a',
  '#14b8a6',
  '#e879f9',
  '#facc15',
  '#38bdf8',
  '#fb7185',
  '#84cc16',
  '#818cf8',
  '#f97316',
  '#2dd4bf',
  '#d946ef',
];

export const AVATARS = [
  '😎',
  '🦊',
  '🐙',
  '🦄',
  '🐸',
  '🐼',
  '🦁',
  '🐵',
  '🐯',
  '🐧',
  '🦉',
  '🐲',
  '👽',
  '🤖',
  '🎃',
  '👻',
  '🧙',
  '🦸',
  '🧛',
  '🥳',
];

export const TEAM_COLORS = ['#ff2fb3', '#20e3ff', '#ffb020', '#22d36b'];

export function makePlayer(index: number, name = ''): Player {
  return {
    id: newId(),
    name,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    avatar: AVATARS[index % AVATARS.length],
    noAlcohol: false,
  };
}

/** Erreurs de saisie des joueurs (messages en français). */
export function validatePlayers(players: Player[]): string[] {
  const errors: string[] = [];
  if (players.length < MIN_PLAYERS) errors.push(`Il faut au moins ${MIN_PLAYERS} joueurs.`);
  if (players.length > MAX_PLAYERS) errors.push(`Maximum ${MAX_PLAYERS} joueurs.`);
  if (players.some((p) => !p.name.trim())) errors.push('Tous les joueurs doivent avoir un nom.');
  const seen = new Set<string>();
  for (const p of players) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) errors.push(`Le nom « ${p.name.trim()} » est utilisé plusieurs fois.`);
    seen.add(key);
  }
  return [...new Set(errors)];
}

export function makeTeams(count: number, previous: Team[] = []): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: previous[i]?.id ?? `team-${i + 1}`,
    name: previous[i]?.name ?? `Équipe ${i + 1}`,
    color: previous[i]?.color ?? TEAM_COLORS[i % TEAM_COLORS.length],
  }));
}

/** Répartition aléatoire équilibrée : les effectifs diffèrent d'au plus 1. */
export function assignTeamsBalanced(
  players: Player[],
  teams: Team[],
  source?: Uint32Source,
): Player[] {
  const assignment = new Map<string, string>();
  shuffle(players, source).forEach((p, i) => assignment.set(p.id, teams[i % teams.length].id));
  return players.map((p) => ({ ...p, teamId: assignment.get(p.id) }));
}

export function validateTeams(players: Player[], teams: Team[]): string[] {
  const errors: string[] = [];
  if (teams.length < 2 || teams.length > 4) errors.push('Il faut de 2 à 4 équipes.');
  if (players.some((p) => !p.teamId || !teams.some((t) => t.id === p.teamId))) {
    errors.push('Chaque joueur doit appartenir à une équipe.');
  }
  for (const t of teams) {
    if (!t.name.trim()) errors.push('Chaque équipe doit avoir un nom.');
    if (!players.some((p) => p.teamId === t.id)) {
      errors.push(`L'équipe « ${t.name || t.id} » n'a aucun joueur.`);
    }
  }
  return errors;
}

/** Ordre de passage : ordre de saisie ou tirage au sort (permutation Fisher–Yates). */
export function buildTurnOrder(
  players: Player[],
  order: 'entry' | 'random',
  source?: Uint32Source,
): string[] {
  const ids = players.map((p) => p.id);
  return order === 'random' ? shuffle(ids, source) : ids;
}
