import type { Outcome, Rules } from './types';

/** Valide le barème : points « boisson bue » strictement inférieurs aux points de carte. */
export function validateRules(rules: Rules): string[] {
  const errors: string[] = [];
  if (!(rules.pointsDrinkDrunk < rules.pointsCard)) {
    errors.push(
      'Les points « boisson bue » doivent être strictement inférieurs aux points de carte.',
    );
  }
  for (const [name, j] of Object.entries(rules.jokers)) {
    if (!Number.isInteger(j.count) || j.count < 0 || j.count > 3) {
      errors.push(`Joker « ${name} » : le nombre doit être compris entre 0 et 3.`);
    }
  }
  return errors;
}

export function pointsFor(
  rules: Rules,
  outcome: Outcome,
  opts: { doubled?: boolean; cardPoints?: number | null } = {},
): number {
  switch (outcome) {
    case 'done':
    case 'duel': {
      const base = opts.cardPoints ?? rules.pointsCard;
      return opts.doubled ? base * 2 : base;
    }
    case 'refused-drink':
      return rules.pointsDrinkDrunk;
    case 'refused-no-drink':
      return 0; // ancien résultat : on ne peut plus refuser de boire
    case 'joker-pass':
      return 0;
  }
}
