import type { Step } from './steps';
import type { Game } from './types';

/**
 * Effets enregistrés dans le journal d'un tour (`TurnEvent.effects`) ou en attente (`Game.carry`).
 * L'état « règles en cours / boucliers » se déduit en rejouant ces effets : l'annulation d'un tour
 * restaure donc automatiquement les règles.
 */
export type EffectRecord =
  /** Un joueur boit `mult` portion(s) de la boisson n°`n`. `via` : protégé par un bouclier / lien. */
  | { k: 'malus'; to: string; n: number; mult: number; via?: string }
  | { k: 'water'; to: string }
  | { k: 'rule'; rule: RuleDef }
  | { k: 'end-rule'; id: string; why: 'cancel' | 'resolved' | 'fault' | 'clear' }
  | { k: 'shield'; id: string; owner: string; protector: string }
  | { k: 'shield-used'; id: string }
  | { k: 'clear' }
  | { k: 'rotate' };

export interface RuleDef {
  id: string;
  text: string;
  /** Joueur qui a créé la règle (sa « carte »). */
  owner: string;
  /** Joueurs concernés, ou 'all'. */
  subjects: string[] | 'all';
  /** Durée en tours de jeu ; absent = illimitée. */
  turns?: number;
  /** Se termine (et se résout) quand revient le tour de `owner`. */
  untilOwnerTurn?: boolean;
  fault?: { mult?: number | 'max'; ends?: boolean; count?: 1 | 'any' };
  /** Alliance : les malus de ces deux joueurs sont partagés 50/50. */
  link?: [string, string];
  /** Étapes à jouer à l'expiration (désigner le fautif, vérifier un contact…). */
  onExpire?: Step[];
  /** Variables de la carte d'origine (partenaire choisi…), réutilisées à l'expiration. */
  vars?: Record<string, string | string[] | number>;
}

export interface ActiveRule extends RuleDef {
  /** Tours joués depuis la création. */
  elapsed: number;
  turnsLeft?: number;
  /** Doit être résolue maintenant (expirée avec des étapes de résolution). */
  due: boolean;
}

export interface ActiveShield {
  id: string;
  owner: string;
  protector: string;
}

export interface DerivedEffects {
  rules: ActiveRule[];
  shields: ActiveShield[];
}

/** Joueur suivant dans l'ordre de passage (le « voisin de gauche »). */
export function leftOf(game: Game, id: string): string {
  const o = game.turnOrder;
  const i = o.indexOf(id);
  return o[(i + 1) % o.length];
}

export function rightOf(game: Game, id: string): string {
  const o = game.turnOrder;
  const i = o.indexOf(id);
  return o[(i - 1 + o.length) % o.length];
}

/** « En face » : à la moitié de la table (pour 2 joueurs : l'autre). */
export function oppositeOf(game: Game, id: string): string {
  const o = game.turnOrder;
  const i = o.indexOf(id);
  return o[(i + Math.floor(o.length / 2)) % o.length];
}

/** Dernier joueur à avoir joué avant le tour courant (sinon son voisin de droite). */
export function previousOf(game: Game, id: string): string {
  const last = game.log[game.log.length - 1];
  return last ? last.turnOwnerId : rightOf(game, id);
}

type ExpiryAware = RuleDef & { elapsed: number };

const expired = (r: ExpiryAware): boolean => r.turns !== undefined && r.elapsed >= r.turns;

/**
 * Rejoue tous les effets (journal, puis effets en attente, puis `extra`) pour obtenir les règles et
 * boucliers actuellement actifs.
 */
export function deriveEffects(game: Game, extra: EffectRecord[] = []): DerivedEffects {
  let rules: ExpiryAware[] = [];
  let shields: ActiveShield[] = [];
  const shift = (id: string) => leftOf(game, id);

  const applyFx = (fx: EffectRecord[]) => {
    for (const e of fx) {
      switch (e.k) {
        case 'rule':
          rules = [...rules.filter((r) => r.id !== e.rule.id), { ...e.rule, elapsed: 0 }];
          break;
        case 'end-rule':
          rules = rules.filter((r) => r.id !== e.id);
          break;
        case 'shield':
          shields = [...shields, { id: e.id, owner: e.owner, protector: e.protector }];
          break;
        case 'shield-used':
          shields = shields.filter((s) => s.id !== e.id);
          break;
        case 'clear':
          rules = [];
          shields = [];
          break;
        case 'rotate':
          rules = rules.map((r) => ({
            ...r,
            owner: shift(r.owner),
            subjects: r.subjects === 'all' ? 'all' : r.subjects.map(shift),
            link: r.link ? ([shift(r.link[0]), shift(r.link[1])] as [string, string]) : undefined,
          }));
          shields = shields.map((s) => ({
            ...s,
            owner: shift(s.owner),
            protector: shift(s.protector),
          }));
          break;
        default:
          break;
      }
    }
  };

  for (const ev of game.log) {
    const before = new Set(rules.map((r) => r.id));
    applyFx(ev.effects ?? []);
    // Un tour vient de se terminer : les règles qui existaient déjà « vieillissent » d'un tour.
    rules = rules
      .map((r) => (before.has(r.id) ? { ...r, elapsed: r.elapsed + 1 } : r))
      .filter((r) => !(before.has(r.id) && expired(r) && !r.onExpire));
  }
  applyFx([...(game.carry ?? []), ...extra]);

  const current = game.log.length ? game.log[game.log.length - 1].nextPlayerId : game.firstPlayerId;
  const active: ActiveRule[] = [];
  for (const r of rules) {
    const ownerTurn = !!r.untilOwnerTurn && r.elapsed >= 1 && current === r.owner;
    const isDue = !!r.onExpire && (expired(r) || ownerTurn);
    // Sans étapes de résolution, une règle « jusqu'à ton prochain tour » disparaît à ce moment.
    if (ownerTurn && !r.onExpire) continue;
    active.push({
      ...r,
      due: isDue,
      turnsLeft: r.turns === undefined ? undefined : Math.max(0, r.turns - r.elapsed),
    });
  }
  return { rules: active, shields };
}

/**
 * Transforme « ces joueurs boivent la boisson n°n × mult » en effets, en appliquant les boucliers
 * (le protecteur boit à la place) et les alliances (malus partagé 50/50).
 */
export function malusEffects(
  game: Game,
  pending: EffectRecord[],
  targets: string[],
  n: number,
  mult: number,
): EffectRecord[] {
  const st = deriveEffects(game, pending);
  const usedShields = new Set<string>();
  const unique = [...new Set(targets)];
  const out: EffectRecord[] = [];
  for (const t of unique) {
    let who = t;
    let via: string | undefined;
    const shield = st.shields.find((s) => s.owner === t && !usedShields.has(s.id));
    if (shield) {
      usedShields.add(shield.id);
      out.push({ k: 'shield-used', id: shield.id });
      who = shield.protector;
      via = t;
    }
    const link = st.rules.find((r) => r.link?.includes(who));
    const partner = link?.link?.find((p) => p !== who);
    if (partner && !unique.includes(partner)) {
      out.push({ k: 'malus', to: who, n, mult: mult / 2, via });
      out.push({ k: 'malus', to: partner, n, mult: mult / 2, via: who });
    } else {
      out.push({ k: 'malus', to: who, n, mult, via });
    }
  }
  return out;
}

/** Pénalité maximale : 3 portions. */
export const MAX_MULT = 3;

export const multOf = (m: number | 'max' | undefined): number =>
  m === 'max' ? MAX_MULT : (m ?? 1);
