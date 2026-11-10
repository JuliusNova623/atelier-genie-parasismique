/**
 * Effets de cartes : un petit « programme » d'étapes attaché à une carte (champ `flow` du contenu).
 * Exemple : « Choisis un adversaire ; le perdant prend le malus » =
 *   pick(adversaire) → pick(perdant parmi moi/adversaire) → malus(perdant).
 *
 * Références de joueurs (`to`, `among`, `protector`, `subject`, placeholders `{…}`) :
 *   me · left · right · opposite · prev · all · others · <nom d'une variable> · <id de joueur>
 */

/** Condition d'exécution d'une étape, sur une variable déjà renseignée. */
export interface When {
  var: string;
  /** La variable vaut l'une de ces valeurs (texte ou nombre). */
  is?: (string | number)[];
  gt?: number;
  lte?: number;
  /** Vrai si la variable est vide (aucun joueur choisi). */
  empty?: boolean;
}

export type FaultSpec = {
  /** Multiplicateur du malus infligé en cas de faute (1 par défaut). */
  mult?: number | 'max';
  /** La règle prend fin dès la première faute. */
  ends?: boolean;
  /** Combien de fautifs peut-on désigner d'un coup (1 par défaut). */
  count?: 1 | 'any';
};

export type StepBody =
  /** Choisir un ou plusieurs joueurs. */
  | {
      do: 'pick';
      as: string;
      prompt: string;
      from?: 'others' | 'all';
      among?: string[];
      count?: 1 | 2 | 'any';
    }
  /** Une question à choix (réussi / raté, oui / non…). */
  | { do: 'ask'; as: string; prompt: string; options: { id: string; label: string }[] }
  /** Choisir un nombre. */
  | { do: 'number'; as: string; prompt: string; min: number; max: number }
  /** Tirer un numéro (sans l'appliquer) et le garder dans une variable. */
  | { do: 'draw'; as: string; prompt?: string }
  /** Faire boire : une boisson tirée au sort, éventuellement multipliée. */
  | {
      do: 'malus';
      to: string | string[];
      mult?: number | 'max';
      draw?: string;
      prompt?: string;
    }
  /** Répartir des portions entre les joueurs (le malus tiré est « distribué »). */
  | { do: 'distribute'; portions: number; draw?: string; by?: string; prompt?: string }
  /** Un grand verre d'eau pour un joueur. */
  | { do: 'water'; to: string; prompt?: string }
  /** Règle durable : contrainte, pacte, alliance… */
  | {
      do: 'rule';
      text: string;
      subject?: string | string[] | 'all';
      turns?: number | 'round';
      until?: 'next-turn' | 'owner-turn' | 'end';
      fault?: FaultSpec;
      link?: [string, string];
      onExpire?: Step[];
    }
  /** Bouclier humain : le protecteur boit à la place de son protégé la prochaine fois. */
  | { do: 'shield'; protector: string }
  /** Annuler une règle en cours (le joueur choisit laquelle). */
  | { do: 'cancel-rule'; prompt?: string }
  /** Efface toutes les règles et boucliers en cours. */
  | { do: 'clear-rules' }
  /** Décale les règles et boucliers d'un cran vers la gauche (« tout le monde passe à son voisin »). */
  | { do: 'rotate-rules' }
  /** Termine une règle précise (interne : fautes et résolutions). */
  | { do: 'end-rule'; id: string; why: 'cancel' | 'resolved' | 'fault' | 'clear' }
  /** Un texte à lire, à valider. */
  | { do: 'info'; text: string };

export type Step = StepBody & { when?: When };

/** Étapes qui demandent une action d'un joueur. */
export const INTERACTIVE = new Set([
  'pick',
  'ask',
  'number',
  'draw',
  'malus',
  'distribute',
  'water',
  'cancel-rule',
  'info',
]);

const BUILTIN_REFS = new Set(['me', 'left', 'right', 'opposite', 'prev', 'all', 'others']);

/**
 * Vérifie qu'un flow n'utilise que des variables déjà définies plus haut (messages en français).
 * Les identifiants de joueurs littéraux (fautes, résolutions) sont ignorés : ils ne commencent pas par une lettre de variable connue.
 */
export function checkFlowRefs(steps: Step[], known: string[] = []): string[] {
  const errors: string[] = [];
  const vars = new Set(known);
  const ref = (r: string | undefined, where: string) => {
    if (r === undefined || BUILTIN_REFS.has(r) || vars.has(r)) return;
    errors.push(`${where} : la variable « ${r} » n'est pas définie avant cette étape.`);
  };
  steps.forEach((s, i) => {
    const at = `étape ${i + 1} (${s.do})`;
    if (s.when) ref(s.when.var, `${at}, condition`);
    switch (s.do) {
      case 'pick':
        s.among?.forEach((r) => ref(r, at));
        vars.add(s.as);
        break;
      case 'ask':
      case 'number':
      case 'draw':
        vars.add(s.as);
        break;
      case 'malus':
        (Array.isArray(s.to) ? s.to : [s.to]).forEach((r) => ref(r, at));
        ref(s.draw, at);
        break;
      case 'distribute':
        ref(s.draw, at);
        ref(s.by, at);
        break;
      case 'water':
        ref(s.to, at);
        break;
      case 'shield':
        ref(s.protector, at);
        break;
      case 'rule': {
        const subj =
          s.subject === undefined ? [] : Array.isArray(s.subject) ? s.subject : [s.subject];
        subj.filter((r) => r !== 'all').forEach((r) => ref(r, at));
        s.link?.forEach((r) => ref(r, at));
        if (s.onExpire)
          errors.push(...checkFlowRefs(s.onExpire, [...vars]).map((e) => `${at}, onExpire : ${e}`));
        break;
      }
      default:
        break;
    }
  });
  return errors;
}
