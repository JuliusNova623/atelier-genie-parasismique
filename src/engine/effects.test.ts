import { createDeck } from './deck';
import { deriveEffects, leftOf, malusEffects, oppositeOf, previousOf, rightOf } from './effects';
import {
  answerFlow,
  faultFlow,
  flowDone,
  resolutionFlow,
  resolveRef,
  startFlow,
  stepView,
  type FlowState,
} from './flow';
import { createGame, currentPlayerId, undoLast } from './game';
import { checkFlowRefs, type Step } from './steps';
import {
  addCarry,
  answerCardFlow,
  cardPlayerId,
  completeCard,
  drawCardNumber,
  drawDrinkNumber,
  drawTheme,
  drinkEffects,
  refuseCard,
  resolveDrink,
  revealPending,
  startCardFlow,
} from './turn';
import { DEFAULT_RULES, type Game, type Player } from './types';

const mk = (id: string): Player => ({
  id,
  name: id.toUpperCase(),
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

function newGame(count = 4, rules = DEFAULT_RULES): Game {
  return createGame({
    now: 0,
    mode: 'solo',
    players: ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, count).map(mk),
    rules,
    themes: [{ id: 't', cardNumbers: createDeck(20) }],
  });
}

/** Source de hasard fixe : le tirage (1..20) vaut `n`. */
const draw = (n: number) => () => n - 1;

const toCard = (g: Game): Game => revealPending(drawCardNumber(revealPending(drawTheme(g))));

/** Joue un tour avec un effet : « Je le fais » → étapes. */
function playFlow(g: Game, steps: Step[], rng = draw(7)) {
  return startCardFlow(toCard(g), steps, 'carte', 1000, rng);
}

describe('voisins', () => {
  it('gauche = joueur suivant, droite = précédent, en face = moitié de table', () => {
    const g = newGame(6);
    expect(leftOf(g, 'a')).toBe('b');
    expect(leftOf(g, 'f')).toBe('a');
    expect(rightOf(g, 'a')).toBe('f');
    expect(rightOf(g, 'c')).toBe('b');
    expect(oppositeOf(g, 'a')).toBe('d');
    expect(oppositeOf(newGame(2), 'a')).toBe('b');
  });

  it('« avant moi » est le dernier joueur à avoir joué, sinon le voisin de droite', () => {
    let g = newGame();
    expect(previousOf(g, 'a')).toBe('d');
    g = completeCard(toCard(g), 1);
    expect(previousOf(g, 'b')).toBe('a');
  });

  it('résout me / others / all / variables / ids', () => {
    const st = startFlow(newGame(), [], 'b', 'interlude');
    const g = newGame();
    expect(resolveRef(g, st, 'me')).toEqual(['b']);
    expect(resolveRef(g, st, 'others')).toEqual(['a', 'c', 'd']);
    expect(resolveRef(g, st, 'all')).toHaveLength(4);
    expect(resolveRef(g, st, 'left')).toEqual(['c']);
    expect(resolveRef(g, { ...st, vars: { x: ['a', 'd'] } }, 'x')).toEqual(['a', 'd']);
    expect(resolveRef(g, st, 'c')).toEqual(['c']);
    expect(resolveRef(g, st, 'inconnu')).toEqual([]);
  });
});

describe('choisir un joueur', () => {
  const steps: Step[] = [{ do: 'pick', as: 'x', prompt: 'Qui ?', from: 'others' }];

  it('propose les autres joueurs et refuse soi-même ou un inconnu', () => {
    const g = newGame();
    const st = startFlow(g, steps, 'a', 'card');
    const v = stepView(g, st)!;
    expect(v).toMatchObject({ kind: 'pick', candidates: ['b', 'c', 'd'], count: 1 });
    expect(() => answerFlow(g, st, { ids: ['a'] })).toThrow('non autorisé');
    expect(() => answerFlow(g, st, { ids: ['zz'] })).toThrow();
    expect(() => answerFlow(g, st, { ids: [] })).toThrow('un joueur');
    expect(() => answerFlow(g, st, { ids: ['b', 'c'] })).toThrow('un joueur');
  });

  it('mémorise le choix dans la variable', () => {
    const g = newGame();
    const st = answerFlow(g, startFlow(g, steps, 'a', 'card'), { ids: ['c'] });
    expect(st.vars.x).toBe('c');
    expect(flowDone(st)).toBe(true);
  });

  it("choisir deux joueurs, ou n'importe combien", () => {
    const g = newGame();
    const two = startFlow(g, [{ do: 'pick', as: 'p', prompt: '?', count: 2 }], 'a', 'card');
    expect(() => answerFlow(g, two, { ids: ['b'] })).toThrow('deux');
    expect(answerFlow(g, two, { ids: ['b', 'd'] }).vars.p).toEqual(['b', 'd']);
    const any = startFlow(g, [{ do: 'pick', as: 'p', prompt: '?', count: 'any' }], 'a', 'card');
    expect(answerFlow(g, any, { ids: [] }).vars.p).toEqual([]);
    expect(answerFlow(g, any, { ids: ['b', 'c', 'd'] }).vars.p).toEqual(['b', 'c', 'd']);
  });

  it("« parmi » restreint le choix (le perdant d'un duel)", () => {
    const g = newGame();
    let st = startFlow(
      g,
      [
        { do: 'pick', as: 'opp', prompt: 'Adversaire ?' },
        { do: 'pick', as: 'loser', prompt: 'Qui a perdu ?', among: ['me', 'opp'] },
        { do: 'malus', to: 'loser' },
      ],
      'a',
      'card',
      undefined,
      draw(5),
    );
    st = answerFlow(g, st, { ids: ['c'] }, draw(5));
    const v = stepView(g, st)!;
    expect(v).toMatchObject({ kind: 'pick', candidates: ['a', 'c'] });
    expect(() => answerFlow(g, st, { ids: ['b'] })).toThrow();
    st = answerFlow(g, st, { ids: ['c'] }, draw(5));
    const m = stepView(g, st)!;
    expect(m).toMatchObject({ kind: 'malus', n: 5, mult: 1, targets: ['c'] });
    st = answerFlow(g, st, {});
    expect(st.effects).toEqual([{ k: 'malus', to: 'c', n: 5, mult: 1, via: undefined }]);
  });

  it('saute un choix impossible (personne à désigner)', () => {
    const g = newGame(2);
    const st = startFlow(
      g,
      [
        { do: 'pick', as: 'p', prompt: '?', count: 2 },
        { do: 'info', text: 'ok' },
      ],
      'a',
      'card',
    );
    expect(stepView(g, st)).toEqual({ kind: 'info', text: 'ok' });
    expect(st.vars.p).toEqual([]);
  });
});

describe('malus', () => {
  it("tire une boisson avant l'affichage et la conserve (reprise sans nouveau tirage)", () => {
    const g = newGame();
    const st = startFlow(g, [{ do: 'malus', to: 'me', mult: 2 }], 'a', 'card', undefined, draw(9));
    expect(st.live).toEqual({ index: 0, n: 9 });
    const restored = JSON.parse(JSON.stringify(st)) as FlowState;
    expect(stepView(g, restored)).toMatchObject({ n: 9, mult: 2, targets: ['a'] });
  });

  it('respecte le nombre de boissons de la partie', () => {
    const g = newGame(4, { ...DEFAULT_RULES, drinkCount: 3 });
    for (let i = 0; i < 100; i++) {
      const st = startFlow(g, [{ do: 'malus', to: 'me' }], 'a', 'card');
      expect(st.live!.n).toBeGreaterThanOrEqual(1);
      expect(st.live!.n).toBeLessThanOrEqual(3);
    }
  });

  it('« max » = 3 portions ; tout le monde, les autres, une liste', () => {
    const g = newGame();
    const run = (to: Step & { do: 'malus' }) => {
      const st = answerFlow(g, startFlow(g, [to], 'a', 'card', undefined, draw(4)), {});
      return st.effects.map((e) => (e.k === 'malus' ? `${e.to}×${e.mult}` : e.k));
    };
    expect(run({ do: 'malus', to: 'me', mult: 'max' })).toEqual(['a×3']);
    expect(run({ do: 'malus', to: 'all' })).toEqual(['a×1', 'b×1', 'c×1', 'd×1']);
    expect(run({ do: 'malus', to: 'others' })).toEqual(['b×1', 'c×1', 'd×1']);
    expect(run({ do: 'malus', to: ['me', 'left'] })).toEqual(['a×1', 'b×1']);
  });

  it('réutilise un numéro déjà tiré (« donne ce malus à un autre »)', () => {
    const g = newGame();
    let st = startFlow(
      g,
      [
        { do: 'draw', as: 'm' },
        { do: 'pick', as: 'x', prompt: 'À qui ?' },
        { do: 'malus', to: 'x', draw: 'm' },
      ],
      'a',
      'card',
      undefined,
      draw(12),
    );
    expect(stepView(g, st)).toMatchObject({ kind: 'draw', n: 12 });
    st = answerFlow(g, st, {}, draw(1)); // un autre tirage aurait donné 1
    st = answerFlow(g, st, { ids: ['d'] }, draw(1));
    expect(stepView(g, st)).toMatchObject({ kind: 'malus', n: 12, targets: ['d'] });
    st = answerFlow(g, st, {});
    expect(st.effects).toEqual([{ k: 'malus', to: 'd', n: 12, mult: 1, via: undefined }]);
  });

  it("saute le malus quand personne n'est désigné", () => {
    const g = newGame();
    const st = startFlow(
      g,
      [
        { do: 'pick', as: 'x', prompt: '?', count: 'any' },
        { do: 'malus', to: 'x' },
        { do: 'info', text: 'fin' },
      ],
      'a',
      'card',
    );
    const done = answerFlow(g, st, { ids: [] });
    expect(done.effects).toEqual([]);
    expect(stepView(g, done)).toEqual({ kind: 'info', text: 'fin' });
  });

  it("un « verre d'eau » est enregistré pour le joueur désigné", () => {
    const g = newGame();
    let st = startFlow(
      g,
      [
        { do: 'pick', as: 'x', prompt: '?' },
        { do: 'water', to: 'x' },
      ],
      'a',
      'card',
    );
    st = answerFlow(g, st, { ids: ['b'] });
    expect(stepView(g, st)).toMatchObject({ kind: 'water', to: ['b'] });
    st = answerFlow(g, st, {});
    expect(st.effects).toEqual([{ k: 'water', to: 'b' }]);
  });
});

describe('répartir des portions', () => {
  const steps: Step[] = [{ do: 'distribute', portions: 3 }];

  it('exige exactement le bon total et enregistre un malus par bénéficiaire', () => {
    const g = newGame();
    const st = startFlow(g, steps, 'a', 'card', undefined, draw(6));
    expect(stepView(g, st)).toMatchObject({ kind: 'distribute', n: 6, portions: 3 });
    expect(() => answerFlow(g, st, { alloc: { b: 2 } })).toThrow('exactement 3');
    expect(() => answerFlow(g, st, { alloc: { b: 2, c: 2 } })).toThrow('exactement 3');
    expect(() => answerFlow(g, st, { alloc: { zz: 3 } })).toThrow('invalide');
    const done = answerFlow(g, st, { alloc: { b: 2, c: 1, d: 0 } });
    expect(done.effects).toEqual([
      { k: 'malus', to: 'b', n: 6, mult: 2, via: undefined },
      { k: 'malus', to: 'c', n: 6, mult: 1, via: undefined },
    ]);
  });
});

describe('conditions', () => {
  it('« when » : égalité, parité, seuils, vide', () => {
    const g = newGame();
    const flow: Step[] = [
      { do: 'number', as: 'n', prompt: 'Chiffre ?', min: 1, max: 10 },
      { do: 'malus', to: 'left', draw: undefined, when: { var: 'n', is: [2, 4, 6, 8, 10] } },
      { do: 'malus', to: 'me', mult: 2, when: { var: 'n', is: [1, 3, 5, 7, 9] } },
    ];
    const even = answerFlow(
      g,
      startFlow(g, flow, 'a', 'card', undefined, draw(3)),
      { value: 4 },
      draw(3),
    );
    expect(stepView(g, even)).toMatchObject({ kind: 'malus', targets: ['b'], mult: 1 });
    const odd = answerFlow(
      g,
      startFlow(g, flow, 'a', 'card', undefined, draw(3)),
      { value: 7 },
      draw(3),
    );
    expect(stepView(g, odd)).toMatchObject({ kind: 'malus', targets: ['a'], mult: 2 });
    expect(() => answerFlow(g, startFlow(g, flow, 'a', 'card'), { value: 11 })).toThrow('invalide');
  });

  it('« quitte ou double » : > 5 on distribue le double, ≤ 5 on prend le triple', () => {
    const g = newGame();
    const flow: Step[] = [
      { do: 'draw', as: 'd' },
      { do: 'distribute', portions: 2, draw: 'd', when: { var: 'd', gt: 5 } },
      { do: 'malus', to: 'me', mult: 3, draw: 'd', when: { var: 'd', lte: 5 } },
    ];
    let hi = answerFlow(g, startFlow(g, flow, 'a', 'card', undefined, draw(9)), {}, draw(9));
    expect(stepView(g, hi)).toMatchObject({ kind: 'distribute', portions: 2, n: 9 });
    hi = answerFlow(g, hi, { alloc: { b: 1, c: 1 } });
    expect(hi.effects.filter((e) => e.k === 'malus')).toHaveLength(2);

    const lo = answerFlow(g, startFlow(g, flow, 'a', 'card', undefined, draw(5)), {}, draw(5));
    expect(stepView(g, lo)).toMatchObject({ kind: 'malus', mult: 3, n: 5, targets: ['a'] });
  });

  it('« when » sur une question à choix', () => {
    const g = newGame();
    const flow: Step[] = [
      {
        do: 'ask',
        as: 'r',
        prompt: 'Réussi ?',
        options: [
          { id: 'yes', label: 'Oui' },
          { id: 'no', label: 'Non' },
        ],
      },
      { do: 'malus', to: 'me', mult: 2, when: { var: 'r', is: ['no'] } },
    ];
    const ok = answerFlow(g, startFlow(g, flow, 'a', 'card'), { id: 'yes' });
    expect(flowDone(ok)).toBe(true);
    expect(ok.effects).toEqual([]);
    const ko = answerFlow(
      g,
      startFlow(g, flow, 'a', 'card', undefined, draw(2)),
      { id: 'no' },
      draw(2),
    );
    expect(stepView(g, ko)).toMatchObject({ kind: 'malus', mult: 2 });
    expect(() => answerFlow(g, startFlow(g, flow, 'a', 'card'), { id: '?' })).toThrow('inconnu');
  });
});

describe('règles durables', () => {
  const ruleStep: Step = { do: 'rule', text: 'Parler en rimes', turns: 3 };

  it('une règle dure N tours après sa création, puis disparaît', () => {
    let g = playFlow(newGame(), [ruleStep]);
    expect(g.pending).toBeNull(); // aucune étape à jouer : tour enregistré directement
    expect(g.log).toHaveLength(1);
    const left = () => deriveEffects(g).rules.map((r) => r.turnsLeft);
    expect(left()).toEqual([3]);
    for (const expected of [[2], [1], []]) {
      g = completeCard(toCard(g), 1);
      expect(left()).toEqual(expected);
    }
  });

  it('« round » = un tour de table complet', () => {
    const g = playFlow(newGame(5), [{ do: 'rule', text: 'x', turns: 'round' }]);
    expect(deriveEffects(g).rules[0].turnsLeft).toBe(5);
  });

  it('« until: next-turn » dure exactement un tour', () => {
    let g = playFlow(newGame(), [{ do: 'rule', text: 'x', until: 'next-turn' }]);
    expect(deriveEffects(g).rules).toHaveLength(1);
    g = completeCard(toCard(g), 1);
    expect(deriveEffects(g).rules).toHaveLength(0);
  });

  it("une règle « jusqu'à la fin » ne s'efface pas", () => {
    let g = playFlow(newGame(), [{ do: 'rule', text: 'pacte', until: 'end' }]);
    for (let i = 0; i < 6; i++) g = completeCard(toCard(g), i);
    expect(deriveEffects(g).rules).toHaveLength(1);
    expect(deriveEffects(g).rules[0].turnsLeft).toBeUndefined();
  });

  it("s'applique à soi, à un partenaire choisi, ou à tous ; le texte cite les prénoms", () => {
    const g = newGame();
    const st = answerFlow(
      g,
      startFlow(
        g,
        [
          { do: 'pick', as: 'p', prompt: 'Partenaire ?' },
          { do: 'rule', text: 'Pacte entre {me} et {p}', subject: ['me', 'p'], until: 'end' },
          { do: 'rule', text: 'Règle pour tous', subject: 'all', turns: 2 },
        ],
        'a',
        'card',
      ),
      { ids: ['c'] },
    );
    const fx = st.effects
      .filter((e) => e.k === 'rule')
      .map((e) => (e.k === 'rule' ? e.rule : null)!);
    expect(fx[0]).toMatchObject({ text: 'Pacte entre A et C', subjects: ['a', 'c'], owner: 'a' });
    expect(fx[1]).toMatchObject({ subjects: 'all', turns: 2 });
  });

  it('annuler le tour qui a créé la règle la retire aussi', () => {
    const g = playFlow(newGame(), [ruleStep]);
    expect(deriveEffects(g).rules).toHaveLength(1);
    expect(deriveEffects(undoLast(g)).rules).toHaveLength(0);
  });

  it('survit à un rechargement JSON de la partie', () => {
    const g = playFlow(newGame(), [ruleStep]);
    const back = JSON.parse(JSON.stringify(g)) as Game;
    expect(deriveEffects(back).rules.map((r) => r.text)).toEqual(['Parler en rimes']);
  });
});

describe('fautes et fin de règle', () => {
  it('« Faute » : désigne un fautif parmi les concernés et lui inflige le malus', () => {
    let g = playFlow(newGame(), [
      { do: 'rule', text: 'Pas de main droite', subject: 'all', turns: 3, fault: { mult: 2 } },
    ]);
    const rule = deriveEffects(g).rules[0];
    let st = faultFlow(g, rule, draw(8));
    expect(stepView(g, st)).toMatchObject({ kind: 'pick', candidates: ['a', 'b', 'c', 'd'] });
    st = answerFlow(g, st, { ids: ['c'] }, draw(8));
    expect(stepView(g, st)).toMatchObject({ kind: 'malus', mult: 2, n: 8, targets: ['c'] });
    st = answerFlow(g, st, {});
    g = addCarry(g, st.effects);
    expect(deriveEffects(g).rules).toHaveLength(1); // la règle continue
    // Les effets en attente sont joints au prochain tour enregistré.
    g = completeCard(toCard(g), 5);
    expect(g.carry).toBeUndefined();
    expect(g.log[g.log.length - 1].effects).toEqual([
      { k: 'malus', to: 'c', n: 8, mult: 2, via: undefined },
    ]);
  });

  it('« première faute = sanction » : la règle prend fin', () => {
    let g = playFlow(newGame(), [
      {
        do: 'rule',
        text: 'Téléphones au centre',
        subject: 'all',
        turns: 3,
        fault: { mult: 'max', ends: true },
      },
    ]);
    const st = answerFlow(
      g,
      answerFlow(g, faultFlow(g, deriveEffects(g).rules[0], draw(2)), { ids: ['b'] }, draw(2)),
      {},
    );
    g = addCarry(g, st.effects);
    expect(st.effects.at(-1)).toMatchObject({ k: 'end-rule', why: 'fault' });
    expect(deriveEffects(g).rules).toHaveLength(0);
  });

  it('plusieurs fautifs possibles pour « trinquer ensemble »', () => {
    const g = playFlow(newGame(), [
      { do: 'rule', text: 'Yeux', subject: 'all', turns: 3, fault: { count: 'any' } },
    ]);
    let st = faultFlow(g, deriveEffects(g).rules[0], draw(3));
    st = answerFlow(g, st, { ids: ['a', 'd'] }, draw(3));
    expect(stepView(g, st)).toMatchObject({ kind: 'malus', targets: ['a', 'd'] });
  });

  it("une règle destinée à une seule personne ne propose qu'elle comme fautive", () => {
    const g = playFlow(newGame(), [{ do: 'rule', text: 'Arrogant', subject: 'me', turns: 3 }]);
    const v = stepView(g, faultFlow(g, deriveEffects(g).rules[0]))!;
    expect(v).toMatchObject({ kind: 'pick', candidates: ['a'] });
  });
});

describe("résolution à l'expiration (« le dernier prend un malus »)", () => {
  const rule: Step = {
    do: 'rule',
    text: 'Maître des pouces',
    until: 'owner-turn',
    onExpire: [
      { do: 'pick', as: 'last', prompt: 'Qui a posé son pouce en dernier ?', from: 'all' },
      { do: 'malus', to: 'last' },
    ],
  };

  it('devient « à résoudre » quand revient le tour du créateur, puis disparaît', () => {
    let g = playFlow(newGame(), [rule]); // a joue
    expect(deriveEffects(g).rules[0].due).toBe(false);
    for (let i = 0; i < 3; i++) {
      g = completeCard(toCard(g), i); // b, c, d
      expect(currentPlayerId(g)).toBe(['c', 'd', 'a'][i]);
    }
    const r = deriveEffects(g).rules[0];
    expect(r.due).toBe(true);
    let st = resolutionFlow(g, r, draw(4));
    st = answerFlow(g, st, { ids: ['d'] }, draw(4));
    st = answerFlow(g, st, {});
    g = addCarry(g, st.effects);
    expect(deriveEffects(g).rules).toHaveLength(0);
    expect(st.effects.map((e) => e.k)).toEqual(['malus', 'end-rule']);
  });

  it("« jusqu'à la prochaine roue » (next-turn) devient à résoudre après un tour", () => {
    let g = playFlow(newGame(), [
      {
        do: 'rule',
        text: 'Mot interdit',
        until: 'next-turn',
        onExpire: [
          { do: 'pick', as: 'w', prompt: "Qui l'a dit ?", count: 'any', from: 'all' },
          { do: 'malus', to: 'w' },
        ],
      },
    ]);
    expect(deriveEffects(g).rules[0].due).toBe(false);
    g = completeCard(toCard(g), 1);
    expect(deriveEffects(g).rules[0].due).toBe(true);
  });

  it('réutilise les choix de la carte (le partenaire) à la résolution', () => {
    const g0 = newGame();
    let st = startFlow(
      g0,
      [
        { do: 'pick', as: 'p', prompt: 'Partenaire ?' },
        {
          do: 'rule',
          text: 'Siamois',
          subject: ['me', 'p'],
          until: 'owner-turn',
          onExpire: [
            {
              do: 'ask',
              as: 'broke',
              prompt: 'Contact rompu ?',
              options: [
                { id: 'yes', label: 'Oui' },
                { id: 'no', label: 'Non' },
              ],
            },
            { do: 'malus', to: ['me', 'p'], mult: 'max', when: { var: 'broke', is: ['yes'] } },
          ],
        },
      ],
      'a',
      'card',
    );
    st = answerFlow(g0, st, { ids: ['c'] });
    let g = addCarry(g0, st.effects);
    for (let i = 0; i < 4; i++) g = completeCard(toCard(g), i);
    // a rejoue : la règle est due
    const rule = deriveEffects(g).rules[0];
    expect(rule.due).toBe(true);
    let res = resolutionFlow(g, rule, draw(6));
    res = answerFlow(g, res, { id: 'yes' }, draw(6));
    expect(stepView(g, res)).toMatchObject({ kind: 'malus', mult: 3, targets: ['a', 'c'] });
  });
});

describe('bouclier humain', () => {
  const shield: Step[] = [
    { do: 'pick', as: 'p', prompt: 'Bouclier ?' },
    { do: 'shield', protector: 'p' },
  ];

  function shielded(): Game {
    const g0 = newGame();
    const st = answerFlow(g0, startFlow(g0, shield, 'a', 'card'), { ids: ['c'] });
    return addCarry(g0, st.effects);
  }

  it('le protecteur boit à la place du protégé, une seule fois', () => {
    const g = shielded();
    expect(deriveEffects(g).shields).toEqual([
      expect.objectContaining({ owner: 'a', protector: 'c' }),
    ]);
    const fx = malusEffects(g, [], ['a'], 5, 1);
    expect(fx.filter((e) => e.k === 'malus')).toEqual([
      { k: 'malus', to: 'c', n: 5, mult: 1, via: 'a' },
    ]);
    expect(fx.some((e) => e.k === 'shield-used')).toBe(true);
    const after = addCarry(g, fx);
    expect(deriveEffects(after).shields).toHaveLength(0);
    expect(malusEffects(after, [], ['a'], 5, 1)).toEqual([
      { k: 'malus', to: 'a', n: 5, mult: 1, via: undefined },
    ]);
  });

  it("s'applique aussi quand le protégé choisit « Je bois »", () => {
    let g = shielded();
    g = revealPending(drawDrinkNumber(refuseCard(toCard(g)), draw(11)));
    const fx = drinkEffects(g);
    expect(fx.find((e) => e.k === 'malus')).toMatchObject({ to: 'c', via: 'a', n: 11 });
    g = resolveDrink(g, 9);
    expect(g.log[0].effects?.some((e) => e.k === 'shield-used')).toBe(true);
    expect(deriveEffects(g).shields).toHaveLength(0);
    expect(g.log[0].outcome).toBe('refused-drink');
  });

  it('un joueur sans bouclier boit normalement (aucun effet superflu)', () => {
    const g = revealPending(drawDrinkNumber(refuseCard(toCard(newGame()))));
    expect(drinkEffects(g)).toEqual([]);
    expect(resolveDrink(g, 3).log[0].effects).toBeUndefined();
  });
});

describe('alliance : sanctions partagées 50/50', () => {
  it('chaque allié boit la moitié', () => {
    const g0 = newGame();
    const st = answerFlow(
      g0,
      startFlow(
        g0,
        [
          { do: 'pick', as: 'p', prompt: 'Âme sœur ?' },
          { do: 'rule', text: 'Alliance', subject: ['me', 'p'], until: 'end', link: ['me', 'p'] },
        ],
        'a',
        'card',
      ),
      { ids: ['b'] },
    );
    const g = addCarry(g0, st.effects);
    expect(malusEffects(g, [], ['a'], 6, 1)).toEqual([
      { k: 'malus', to: 'a', n: 6, mult: 0.5, via: undefined },
      { k: 'malus', to: 'b', n: 6, mult: 0.5, via: 'a' },
    ]);
    // Si les deux sont visés, chacun boit sa portion entière (pas de double partage).
    expect(
      malusEffects(g, [], ['a', 'b'], 6, 1).map((e) => (e.k === 'malus' ? e.mult : 0)),
    ).toEqual([1, 1]);
    // Un joueur hors alliance n'est pas concerné.
    expect(malusEffects(g, [], ['c'], 6, 1)).toEqual([
      { k: 'malus', to: 'c', n: 6, mult: 1, via: undefined },
    ]);
  });
});

describe('annuler / effacer / décaler', () => {
  function withRules(): Game {
    let g = playFlow(newGame(), [
      { do: 'rule', text: 'R1', subject: 'me', turns: 5 },
      { do: 'rule', text: 'R2', subject: ['me', 'left'], until: 'end' },
      { do: 'pick', as: 'p', prompt: 'Bouclier ?' },
    ]);
    g = answerCardFlow(g, { ids: ['c'] }, 1);
    return g;
  }

  it('« annuler une règle » : le joueur choisit laquelle', () => {
    const g = withRules();
    expect(deriveEffects(g).rules.map((r) => r.text)).toEqual(['R1', 'R2']);
    const st = startFlow(g, [{ do: 'cancel-rule' }], 'b', 'card');
    const v = stepView(g, st)!;
    expect(v.kind).toBe('cancel-rule');
    const r2 = deriveEffects(g).rules[1];
    expect(() => answerFlow(g, st, { ruleId: 'nope' })).toThrow('inconnue');
    const done = answerFlow(g, st, { ruleId: r2.id });
    expect(deriveEffects(addCarry(g, done.effects)).rules.map((r) => r.text)).toEqual(['R1']);
  });

  it("« annuler une règle » est ignoré quand il n'y en a aucune", () => {
    const g = newGame();
    const st = startFlow(g, [{ do: 'cancel-rule' }, { do: 'info', text: 'ok' }], 'a', 'card');
    expect(stepView(g, st)).toEqual({ kind: 'info', text: 'ok' });
  });

  it('« pardon général » efface règles ET boucliers', () => {
    let g = withRules();
    g = addCarry(g, [{ k: 'shield', id: 's', owner: 'a', protector: 'b' }]);
    expect(deriveEffects(g).shields).toHaveLength(1);
    const st = startFlow(g, [{ do: 'clear-rules' }], 'a', 'card');
    g = addCarry(g, st.effects);
    expect(deriveEffects(g)).toEqual({ rules: [], shields: [] });
  });

  it('« révolution » : règles et boucliers passent au voisin de gauche', () => {
    let g = playFlow(newGame(), [
      { do: 'rule', text: 'Gage', subject: 'me', until: 'end' },
      { do: 'pick', as: 'p', prompt: 'x' },
      { do: 'shield', protector: 'p' },
    ]);
    g = answerCardFlow(g, { ids: ['c'] }, 1);
    const st = startFlow(g, [{ do: 'rotate-rules' }], 'b', 'card');
    g = addCarry(g, st.effects);
    const d = deriveEffects(g);
    expect(d.rules[0]).toMatchObject({ owner: 'b', subjects: ['b'] });
    expect(d.shields[0]).toMatchObject({ owner: 'b', protector: 'd' });
  });
});

describe('carte à effet : tour complet', () => {
  it("« Je le fais » ouvre l'effet ; la dernière réponse enregistre le tour (+3) avec ses effets", () => {
    let g = playFlow(newGame(), [
      { do: 'pick', as: 'x', prompt: 'Qui ?' },
      { do: 'malus', to: 'x' },
    ]);
    expect(g.pending?.stage).toBe('flow');
    g = answerCardFlow(g, { ids: ['d'] }, 5, draw(7));
    expect(g.pending?.stage).toBe('flow'); // le malus attend la confirmation
    g = answerCardFlow(g, {}, 6);
    expect(g.pending).toBeNull();
    expect(g.log).toHaveLength(1);
    expect(g.log[0]).toMatchObject({ outcome: 'done', pointsDelta: 3, turnOwnerId: 'a' });
    expect(g.log[0].effects).toEqual([{ k: 'malus', to: 'd', n: 7, mult: 1, via: undefined }]);
    expect(currentPlayerId(g)).toBe('b');
  });

  it('joker Double : les points de carte sont doublés', async () => {
    const { armJoker } = await import('./turn');
    let g = armJoker(toCard(newGame()), 'double');
    g = startCardFlow(g, [{ do: 'info', text: 'x' }], 't', 1);
    g = answerCardFlow(g, {}, 2);
    expect(g.log[0].pointsDelta).toBe(6);
    expect(g.log[0].jokerUsed).toBe('double');
  });

  it("joker Transfert : l'effet est joué par le joueur désigné (« moi »)", async () => {
    const { armJoker } = await import('./turn');
    let g = armJoker(toCard(newGame()), 'transfer', 'c');
    expect(cardPlayerId(g)).toBe('c');
    g = startCardFlow(g, [{ do: 'malus', to: 'me' }], 't', 1, draw(4));
    expect(stepView(g, g.pending!.flow!)).toMatchObject({ targets: ['c'] });
    g = answerCardFlow(g, {}, 2);
    expect(g.log[0]).toMatchObject({ turnOwnerId: 'a', playerId: 'c', jokerUsed: 'transfer' });
  });

  it("reprise : l'effet en cours survit à un rechargement JSON, tirage compris", () => {
    const g = playFlow(newGame(), [{ do: 'malus', to: 'me', mult: 2 }], draw(13));
    const back = JSON.parse(JSON.stringify(g)) as Game;
    expect(stepView(back, back.pending!.flow!)).toMatchObject({ n: 13, mult: 2 });
    const done = answerCardFlow(back, {}, 7);
    expect(done.log[0].effects).toEqual([{ k: 'malus', to: 'a', n: 13, mult: 2, via: undefined }]);
  });

  it("ne permet pas d'ouvrir deux effets, ni pendant un duel", () => {
    const g = playFlow(newGame(), [{ do: 'info', text: 'x' }]);
    expect(() => startCardFlow(g, [], 't', 1)).toThrow();
    expect(() => answerCardFlow(newGame(), {}, 1)).toThrow('Aucun effet');
  });

  it('un effet sans étape à jouer termine le tour immédiatement', () => {
    const g = playFlow(newGame(), [{ do: 'rule', text: 'x', turns: 1 }]);
    expect(g.pending).toBeNull();
    expect(g.log[0].outcome).toBe('done');
  });

  it("annuler le tour retire malus et règles de l'historique", () => {
    let g = playFlow(newGame(), [
      { do: 'rule', text: 'x', until: 'end' },
      { do: 'malus', to: 'me' },
    ]);
    g = answerCardFlow(g, {}, 3);
    expect(g.log[0].effects).toHaveLength(2);
    const back = undoLast(g);
    expect(back.log).toHaveLength(0);
    expect(deriveEffects(back).rules).toHaveLength(0);
  });

  it('les effets en attente ne sont pas perdus par un tour normal', () => {
    let g = addCarry(newGame(), [{ k: 'malus', to: 'b', n: 3, mult: 1 }]);
    g = completeCard(toCard(g), 1);
    expect(g.log[0].effects).toEqual([{ k: 'malus', to: 'b', n: 3, mult: 1 }]);
  });
});

describe('vérification des références', () => {
  it("signale une variable utilisée avant d'être définie", () => {
    const errs = checkFlowRefs([
      { do: 'malus', to: 'x' },
      { do: 'pick', as: 'x', prompt: '?' },
    ]);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('« x »');
    expect(
      checkFlowRefs([
        { do: 'pick', as: 'x', prompt: '?' },
        { do: 'malus', to: 'x' },
      ]),
    ).toEqual([]);
  });

  it('vérifie aussi conditions, tirages réutilisés et résolutions', () => {
    expect(checkFlowRefs([{ do: 'malus', to: 'me', when: { var: 'zz', is: [1] } }])).toHaveLength(
      1,
    );
    expect(checkFlowRefs([{ do: 'malus', to: 'me', draw: 'm' }])).toHaveLength(1);
    expect(
      checkFlowRefs([{ do: 'rule', text: 'r', onExpire: [{ do: 'malus', to: 'inconnu' }] }]),
    ).toHaveLength(1);
  });
});
