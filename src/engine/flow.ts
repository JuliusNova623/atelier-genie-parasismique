import { drawWithReplacement } from './deck';
import { drinkCountOf } from './drinks';
import {
  deriveEffects,
  leftOf,
  malusEffects,
  multOf,
  oppositeOf,
  previousOf,
  rightOf,
  type ActiveRule,
  type EffectRecord,
  type RuleDef,
} from './effects';
import { newId } from './id';
import type { Uint32Source } from './rng';
import type { Step, When } from './steps';
import type { Game } from './types';

export type VarValue = string | string[] | number;

/** Exécution en cours des étapes d'une carte (ou d'une règle / d'une faute). Sérialisable (JSON). */
export interface FlowState {
  purpose: 'card' | 'interlude';
  steps: Step[];
  index: number;
  vars: Record<string, VarValue>;
  /** Le joueur qui joue la carte (« moi »). */
  owner: string;
  effects: EffectRecord[];
  title?: string;
  /** Tirage de l'étape en cours (fixé avant l'affichage, donc stable à la reprise). */
  live?: { index: number; n: number };
  seq: number;
  uid: string;
}

export type FlowInput = {
  ids?: string[];
  id?: string;
  value?: number;
  alloc?: Record<string, number>;
  ruleId?: string;
};

const asArray = (v: VarValue | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [String(v)];

const unique = <T>(a: T[]): T[] => [...new Set(a)];

export const playerName = (game: Game, id: string): string =>
  game.players.find((p) => p.id === id)?.name ?? id;

/** Joueurs désignés par une référence : me, left, right, opposite, prev, all, others, variable ou id. */
export function resolveRef(game: Game, st: FlowState, ref: string): string[] {
  switch (ref) {
    case 'me':
      return [st.owner];
    case 'left':
      return [leftOf(game, st.owner)];
    case 'right':
      return [rightOf(game, st.owner)];
    case 'opposite':
      return [oppositeOf(game, st.owner)];
    case 'prev':
      return [previousOf(game, st.owner)];
    case 'all':
      return game.players.map((p) => p.id);
    case 'others':
      return game.players.map((p) => p.id).filter((id) => id !== st.owner);
    default:
      if (ref in st.vars) return asArray(st.vars[ref]);
      return game.players.some((p) => p.id === ref) ? [ref] : [];
  }
}

const refs = (game: Game, st: FlowState, r: string | string[] | undefined): string[] =>
  unique(
    (Array.isArray(r) ? r : r === undefined ? [] : [r]).flatMap((x) => resolveRef(game, st, x)),
  );

/** Remplace {me}, {left}, {x}… par les prénoms (ou la valeur d'un nombre). */
export function fmt(game: Game, st: FlowState, text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = st.vars[key];
    if (typeof v === 'number') return String(v);
    const names = resolveRef(game, st, key).map((id) => playerName(game, id));
    return names.length ? names.join(' et ') : key;
  });
}

function passes(when: When, st: FlowState): boolean {
  const v = st.vars[when.var];
  if (when.empty !== undefined && (asArray(v).length === 0) !== when.empty) return false;
  if (when.is) {
    const wanted = when.is.map(String);
    const have = Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)];
    if (!have.some((x) => wanted.includes(x))) return false;
  }
  if (when.gt !== undefined && !(typeof v === 'number' && v > when.gt)) return false;
  if (when.lte !== undefined && !(typeof v === 'number' && v <= when.lte)) return false;
  return true;
}

function pickCandidates(game: Game, st: FlowState, step: Extract<Step, { do: 'pick' }>): string[] {
  if (step.among) return refs(game, st, step.among);
  return resolveRef(game, st, step.from === 'all' ? 'all' : 'others');
}

/** Démarre un effet : exécute les étapes automatiques jusqu'à la première étape à jouer. */
export function startFlow(
  game: Game,
  steps: Step[],
  owner: string,
  purpose: FlowState['purpose'],
  title?: string,
  rng?: Uint32Source,
  vars: Record<string, VarValue> = {},
): FlowState {
  return settle(
    game,
    {
      purpose,
      steps,
      index: 0,
      vars: { ...vars },
      owner,
      effects: [],
      title,
      seq: 0,
      uid: newId(),
    },
    rng,
  );
}

function ensureLive(
  game: Game,
  st: FlowState,
  draw: string | undefined,
  rng?: Uint32Source,
): FlowState {
  if (st.live?.index === st.index) return st;
  const n =
    draw !== undefined && typeof st.vars[draw] === 'number'
      ? (st.vars[draw] as number)
      : drawWithReplacement(drinkCountOf(game), rng);
  return { ...st, live: { index: st.index, n } };
}

/** Applique les étapes automatiques (règles, boucliers…) et saute celles dont la condition est fausse. */
export function settle(game: Game, start: FlowState, rng?: Uint32Source): FlowState {
  let st = start;
  while (st.index < st.steps.length) {
    const step = st.steps[st.index];
    const next = (patch: Partial<FlowState> = {}): FlowState => ({
      ...st,
      ...patch,
      index: st.index + 1,
      live: undefined,
    });
    if (step.when && !passes(step.when, st)) {
      st = next();
      continue;
    }
    switch (step.do) {
      case 'rule': {
        const subjects = step.subject === 'all' ? 'all' : refs(game, st, step.subject ?? 'me');
        const turns =
          step.turns === 'round'
            ? game.players.length
            : step.until === 'next-turn'
              ? 1
              : (step.turns as number | undefined);
        const rule: RuleDef = {
          id: `${st.uid}-${st.seq}`,
          text: fmt(game, st, step.text),
          owner: st.owner,
          subjects,
          turns,
          untilOwnerTurn: step.until === 'owner-turn' ? true : undefined,
          fault: step.fault,
          link: step.link
            ? [resolveRef(game, st, step.link[0])[0], resolveRef(game, st, step.link[1])[0]]
            : undefined,
          onExpire: step.onExpire,
          vars: step.onExpire ? { ...st.vars } : undefined,
        };
        st = next({ effects: [...st.effects, { k: 'rule', rule }], seq: st.seq + 1 });
        continue;
      }
      case 'shield': {
        const protector = resolveRef(game, st, step.protector)[0];
        if (!protector) {
          st = next();
          continue;
        }
        const fx: EffectRecord = {
          k: 'shield',
          id: `${st.uid}-${st.seq}`,
          owner: st.owner,
          protector,
        };
        st = next({ effects: [...st.effects, fx], seq: st.seq + 1 });
        continue;
      }
      case 'clear-rules':
        st = next({ effects: [...st.effects, { k: 'clear' }] });
        continue;
      case 'rotate-rules':
        st = next({ effects: [...st.effects, { k: 'rotate' }] });
        continue;
      case 'end-rule':
        st = next({ effects: [...st.effects, { k: 'end-rule', id: step.id, why: step.why }] });
        continue;
      case 'pick': {
        const c = pickCandidates(game, st, step);
        if (c.length === 0 || (step.count === 2 && c.length < 2)) {
          st = next({ vars: { ...st.vars, [step.as]: [] } });
          continue;
        }
        return st;
      }
      case 'cancel-rule':
        if (deriveEffects(game, st.effects).rules.length === 0) {
          st = next();
          continue;
        }
        return st;
      case 'malus':
        if (refs(game, st, step.to).length === 0) {
          st = next();
          continue;
        }
        return ensureLive(game, st, step.draw, rng);
      case 'water':
        if (refs(game, st, step.to).length === 0) {
          st = next();
          continue;
        }
        return st;
      case 'distribute':
      case 'draw':
        return ensureLive(game, st, step.do === 'distribute' ? step.draw : undefined, rng);
      default:
        return st; // ask, number, info
    }
  }
  return st;
}

export const flowDone = (st: FlowState): boolean => st.index >= st.steps.length;

/** Ce que l'interface doit afficher pour l'étape en cours. */
export type StepView =
  | { kind: 'pick'; prompt: string; candidates: string[]; count: 1 | 2 | 'any' }
  | { kind: 'ask'; prompt: string; options: { id: string; label: string }[] }
  | { kind: 'number'; prompt: string; min: number; max: number }
  | { kind: 'draw'; prompt: string; n: number }
  | {
      kind: 'malus';
      prompt: string;
      n: number;
      mult: number;
      targets: string[];
      /** Effets réels après boucliers et alliances. */
      effects: EffectRecord[];
    }
  | { kind: 'distribute'; prompt: string; n: number; portions: number; by?: string }
  | { kind: 'water'; prompt: string; to: string[] }
  | { kind: 'cancel-rule'; prompt: string; rules: ActiveRule[] }
  | { kind: 'info'; text: string };

export function stepView(game: Game, st: FlowState): StepView | null {
  const step = st.steps[st.index];
  if (!step) return null;
  const f = (t: string) => fmt(game, st, t);
  switch (step.do) {
    case 'pick':
      return {
        kind: 'pick',
        prompt: f(step.prompt),
        candidates: pickCandidates(game, st, step),
        count: step.count ?? 1,
      };
    case 'ask':
      return { kind: 'ask', prompt: f(step.prompt), options: step.options };
    case 'number':
      return { kind: 'number', prompt: f(step.prompt), min: step.min, max: step.max };
    case 'draw':
      return { kind: 'draw', prompt: f(step.prompt ?? 'Numéro tiré'), n: st.live!.n };
    case 'malus': {
      const targets = refs(game, st, step.to);
      const n = st.live!.n;
      const mult = multOf(step.mult);
      return {
        kind: 'malus',
        prompt: f(step.prompt ?? 'Malus'),
        n,
        mult,
        targets,
        effects: malusEffects(game, st.effects, targets, n, mult),
      };
    }
    case 'distribute':
      return {
        kind: 'distribute',
        prompt: f(step.prompt ?? 'Répartis le malus entre les joueurs'),
        n: st.live!.n,
        portions: step.portions,
        by: step.by ? refs(game, st, step.by)[0] : undefined,
      };
    case 'water':
      return {
        kind: 'water',
        prompt: f(step.prompt ?? 'Un grand verre d’eau'),
        to: refs(game, st, step.to),
      };
    case 'cancel-rule':
      return {
        kind: 'cancel-rule',
        prompt: f(step.prompt ?? 'Quelle règle annuler ?'),
        rules: deriveEffects(game, st.effects).rules,
      };
    case 'info':
      return { kind: 'info', text: f(step.text) };
    default:
      return null;
  }
}

/** Valide la réponse du joueur, applique l'étape et passe à la suivante. */
export function answerFlow(
  game: Game,
  st: FlowState,
  input: FlowInput,
  rng?: Uint32Source,
): FlowState {
  const step = st.steps[st.index];
  if (!step) throw new Error('Aucune étape en cours.');
  const done = (patch: Partial<FlowState>): FlowState =>
    settle(game, { ...st, ...patch, index: st.index + 1, live: undefined }, rng);

  switch (step.do) {
    case 'pick': {
      const ids = unique(input.ids ?? []);
      const candidates = pickCandidates(game, st, step);
      if (!ids.every((id) => candidates.includes(id))) throw new Error('Joueur non autorisé.');
      const count = step.count ?? 1;
      if (count === 1 && ids.length !== 1) throw new Error('Choisissez un joueur.');
      if (count === 2 && ids.length !== 2) throw new Error('Choisissez deux joueurs.');
      return done({ vars: { ...st.vars, [step.as]: count === 1 ? ids[0] : ids } });
    }
    case 'ask': {
      if (!step.options.some((o) => o.id === input.id)) throw new Error('Choix inconnu.');
      return done({ vars: { ...st.vars, [step.as]: input.id! } });
    }
    case 'number': {
      const v = input.value;
      if (!Number.isInteger(v) || v! < step.min || v! > step.max)
        throw new Error('Nombre invalide.');
      return done({ vars: { ...st.vars, [step.as]: v! } });
    }
    case 'draw':
      return done({ vars: { ...st.vars, [step.as]: st.live!.n } });
    case 'malus': {
      const targets = refs(game, st, step.to);
      const fx = malusEffects(game, st.effects, targets, st.live!.n, multOf(step.mult));
      return done({ effects: [...st.effects, ...fx] });
    }
    case 'distribute': {
      const alloc = input.alloc ?? {};
      const entries = Object.entries(alloc).filter(([, c]) => c > 0);
      const total = entries.reduce((s, [, c]) => s + c, 0);
      if (total !== step.portions)
        throw new Error(`Répartissez exactement ${step.portions} portion(s).`);
      if (
        !entries.every(([id, c]) => game.players.some((p) => p.id === id) && Number.isInteger(c))
      ) {
        throw new Error('Répartition invalide.');
      }
      let effects = st.effects;
      for (const [id, c] of entries) {
        effects = [...effects, ...malusEffects(game, effects, [id], st.live!.n, c)];
      }
      return done({ effects });
    }
    case 'water': {
      const fx: EffectRecord[] = refs(game, st, step.to).map((to) => ({ k: 'water', to }));
      return done({ effects: [...st.effects, ...fx] });
    }
    case 'cancel-rule': {
      const rules = deriveEffects(game, st.effects).rules;
      if (!rules.some((r) => r.id === input.ruleId)) throw new Error('Règle inconnue.');
      return done({
        effects: [...st.effects, { k: 'end-rule', id: input.ruleId!, why: 'cancel' }],
      });
    }
    case 'info':
      return done({});
    default:
      throw new Error('Étape automatique.');
  }
}

/** « Faute » : désigner le fautif d'une règle, lui infliger le malus (et éventuellement la terminer). */
export function faultFlow(game: Game, rule: ActiveRule, rng?: Uint32Source): FlowState {
  const subjects = rule.subjects === 'all' ? game.players.map((p) => p.id) : rule.subjects;
  const steps: Step[] = [
    {
      do: 'pick',
      as: 'x',
      prompt: rule.fault?.count === 'any' ? 'Qui a fauté ?' : 'Qui a fauté ?',
      among: subjects,
      count: rule.fault?.count ?? 1,
    },
    { do: 'malus', to: 'x', mult: rule.fault?.mult },
    ...(rule.fault?.ends ? [{ do: 'end-rule', id: rule.id, why: 'fault' } as Step] : []),
  ];
  return startFlow(game, steps, rule.owner, 'interlude', rule.text, rng);
}

/** Résolution d'une règle arrivée à expiration (« qui a posé son pouce en dernier ? »…). */
export function resolutionFlow(game: Game, rule: ActiveRule, rng?: Uint32Source): FlowState {
  const steps: Step[] = [
    ...(rule.onExpire ?? []),
    { do: 'end-rule', id: rule.id, why: 'resolved' },
  ];
  return startFlow(game, steps, rule.owner, 'interlude', rule.text, rng, rule.vars ?? {});
}

/** Terminer une règle à la main (sans malus). */
export function endRuleEffect(rule: ActiveRule): EffectRecord {
  return { k: 'end-rule', id: rule.id, why: 'cancel' };
}
