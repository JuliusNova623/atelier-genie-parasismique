import { builtInContent } from './index';
import { validateContent } from './validate';
import { createDeck } from '../engine/deck';
import { deriveEffects } from '../engine/effects';
import {
  answerFlow,
  faultFlow,
  flowDone,
  resolutionFlow,
  startFlow,
  stepView,
  type FlowState,
} from '../engine/flow';
import { createGame, currentPlayerId } from '../engine/game';
import { checkFlowRefs } from '../engine/steps';
import {
  addCarry,
  answerCardFlow,
  completeCard,
  drawCardNumber,
  drawTheme,
  revealPending,
  startCardFlow,
} from '../engine/turn';
import { DEFAULT_RULES, type Game, type Player } from '../engine/types';

const THEMES = builtInContent.themes;
const WITH_FLOW = THEMES.flatMap((t) => t.cards.filter((c) => c.flow).map((c) => ({ t, c })));

const mk = (id: string): Player => ({
  id,
  name: id.toUpperCase(),
  color: '#fff',
  avatar: '🙂',
  noAlcohol: false,
});

function game(count: number): Game {
  return createGame({
    now: 0,
    mode: 'solo',
    players: ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, count).map(mk),
    rules: DEFAULT_RULES,
    themes: THEMES.map((t) => ({ id: t.id, cardNumbers: createDeck(20) })),
  });
}

/** Réponse valide aléatoire pour l'étape affichée (comme le ferait un joueur). */
function randomAnswer(g: Game, st: FlowState) {
  const v = stepView(g, st)!;
  const pickN = <T>(a: T[], n: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, n);
  switch (v.kind) {
    case 'pick': {
      const n = v.count === 'any' ? Math.floor(Math.random() * (v.candidates.length + 1)) : v.count;
      return { ids: pickN(v.candidates, n) };
    }
    case 'ask':
      return { id: v.options[Math.floor(Math.random() * v.options.length)].id };
    case 'number':
      return { value: v.min + Math.floor(Math.random() * (v.max - v.min + 1)) };
    case 'distribute': {
      const alloc: Record<string, number> = {};
      const ids = g.players.map((p) => p.id);
      for (let i = 0; i < v.portions; i++) {
        const id = ids[Math.floor(Math.random() * ids.length)];
        alloc[id] = (alloc[id] ?? 0) + 1;
      }
      return { alloc };
    }
    case 'cancel-rule':
      return { ruleId: v.rules[Math.floor(Math.random() * v.rules.length)].id };
    default:
      return {};
  }
}

/** Joue un effet jusqu'au bout avec des réponses aléatoires ; renvoie l'état final. */
function playOut(g: Game, st: FlowState): FlowState {
  let cur = st;
  for (let i = 0; i < 40 && !flowDone(cur); i++) cur = answerFlow(g, cur, randomAnswer(g, cur));
  expect(flowDone(cur)).toBe(true);
  return cur;
}

describe('effets des cartes du PDF', () => {
  it("108 cartes ont un effet, réparties comme dans l'analyse du PDF", () => {
    const per = THEMES.map((t) => t.cards.filter((c) => c.flow).length);
    expect(per).toEqual([4, 20, 0, 0, 10, 0, 20, 20, 20, 14]);
    expect(WITH_FLOW).toHaveLength(108);
  });

  it('le contenu intégré est valide, références de variables comprises', () => {
    const r = validateContent(JSON.parse(JSON.stringify(builtInContent)));
    expect(r.errors).toEqual([]);
    for (const { t, c } of WITH_FLOW) {
      expect(checkFlowRefs(c.flow!), `${t.name} #${c.number}`).toEqual([]);
    }
  });

  it('une référence de variable cassée dans une carte importée est signalée', () => {
    const bad = JSON.parse(JSON.stringify(builtInContent));
    bad.themes[1].cards[0].flow = [{ do: 'malus', to: 'perdu' }];
    const r = validateContent(bad);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('« perdu »');
    expect(r.errors[0]).toContain('carte 1');
  });

  it.each([2, 3, 4, 6])(
    "chaque carte à effet se joue jusqu'au bout avec %i joueurs (réponses aléatoires, 25 essais)",
    (players) => {
      for (const { t, c } of WITH_FLOW) {
        for (let k = 0; k < 25; k++) {
          const g = game(players);
          const owner = g.players[k % players].id;
          const st = startFlow(g, c.flow!, owner, 'card', c.text);
          let fin: FlowState;
          try {
            fin = playOut(g, st);
          } catch (e) {
            throw new Error(
              `${t.name} #${c.number} (${players} joueurs) : ${(e as Error).message}`,
              { cause: e },
            );
          }
          // Tous les effets pointent vers des joueurs existants.
          const ids = new Set(g.players.map((p) => p.id));
          for (const fx of fin.effects) {
            if (fx.k === 'malus' || fx.k === 'water') expect(ids.has(fx.to)).toBe(true);
            if (fx.k === 'malus') {
              expect(fx.n).toBeGreaterThanOrEqual(1);
              expect(fx.n).toBeLessThanOrEqual(20);
              expect(fx.mult).toBeGreaterThan(0);
            }
          }
          expect(() => deriveEffects(addCarry(g, fin.effects))).not.toThrow();
        }
      }
    },
  );

  it('les règles, fautes et résolutions des cartes fonctionnent de bout en bout', () => {
    let rules = 0;
    let resolutions = 0;
    for (const { t, c } of WITH_FLOW) {
      let g = game(4);
      g = startCardFlow(
        revealPending(
          drawCardNumber({
            ...revealPending(drawTheme(g)),
            pending: { stage: 'theme', themeId: t.id, revealed: true },
          }),
        ),
        c.flow!,
        c.text,
        1,
      );
      while (g.pending?.stage === 'flow') {
        g = answerCardFlow(g, randomAnswer(g, g.pending.flow!), 2);
      }
      expect(g.log).toHaveLength(1);
      expect(g.log[0].outcome).toBe('done');
      for (const r of deriveEffects(g).rules) {
        rules++;
        // Faute : jouable.
        const fault = faultFlow(g, r);
        expect(() => playOut(g, fault), `${t.name} #${c.number} faute`).not.toThrow();
      }
      // On fait tourner la table : les règles à résoudre le deviennent et se résolvent.
      for (let i = 0; i < 6; i++) {
        const due = deriveEffects(g).rules.find((r) => r.due);
        if (due) {
          const res = playOut(g, resolutionFlow(g, due));
          g = addCarry(g, res.effects);
          resolutions++;
          expect(deriveEffects(g).rules.some((r) => r.id === due.id)).toBe(false);
        }
        g = completeCard(
          revealPending(
            drawCardNumber({
              ...g,
              pending: { stage: 'theme', themeId: THEMES[2].id, revealed: true },
            }),
          ),
          3 + i,
        );
      }
      expect(currentPlayerId(g)).toBeTruthy();
    }
    expect(rules).toBeGreaterThan(20);
    expect(resolutions).toBeGreaterThanOrEqual(3);
  });
});

describe('scénarios précis tirés du PDF', () => {
  const card = (theme: number, n: number) => THEMES[theme - 1].cards[n - 1];
  const run = (
    theme: number,
    n: number,
    answers: Record<string, unknown>[],
    players = 4,
    rng?: () => number,
  ) => {
    const g = game(players);
    let st = startFlow(g, card(theme, n).flow!, 'a', 'card', undefined, rng);
    for (const a of answers) st = answerFlow(g, st, a, rng);
    return { g, st };
  };
  const draw = (n: number) => () => n - 1;

  it("Bataille de regards : le perdant (moi ou l'adversaire) prend le malus", () => {
    const { st } = run(2, 1, [{ ids: ['c'] }, { ids: ['c'] }, {}], 4, draw(9));
    expect(st.effects).toEqual([{ k: 'malus', to: 'c', n: 9, mult: 1, via: undefined }]);
    const { st: st2 } = run(2, 1, [{ ids: ['c'] }, { ids: ['a'] }, {}], 4, draw(9));
    expect(st2.effects[0]).toMatchObject({ k: 'malus', to: 'a' });
  });

  it('Pacte du diable : accepté = moitié chacun ; refusé = je prends tout + gage', () => {
    const yes = run(2, 15, [{ ids: ['b'] }, { id: 'yes' }, {}], 4, draw(6)).st;
    expect(yes.effects.map((e) => (e.k === 'malus' ? [e.to, e.mult] : e.k))).toEqual([
      ['a', 0.5],
      ['b', 0.5],
    ]);
    const no = run(2, 15, [{ ids: ['b'] }, { id: 'no' }, {}], 4, draw(6));
    expect(no.st.effects.map((e) => (e.k === 'malus' ? [e.to, e.mult] : e.k))).toEqual([['a', 1]]);
    expect(stepView(no.g, no.st)).toMatchObject({
      kind: 'info',
      text: expect.stringContaining('gage public'),
    });
  });

  it('Trahison éclair : il rit → il boit ; il se vexe → je bois', () => {
    const laugh = run(2, 19, [{ ids: ['d'] }, { id: 'laugh' }, {}], 4, draw(3)).st;
    expect(laugh.effects[0]).toMatchObject({ to: 'd' });
    const vexed = run(2, 19, [{ ids: ['d'] }, { id: 'vexed' }, {}], 4, draw(3)).st;
    expect(vexed.effects[0]).toMatchObject({ to: 'a' });
  });

  it('Mission secrète : règle visible, puis « le dernier prend un malus » au prochain tour du créateur', () => {
    const g0 = game(4);
    const st = startFlow(g0, card(2, 4).flow!, 'a', 'card');
    let g = addCarry(g0, st.effects);
    for (let i = 0; i < 4; i++) {
      g = completeCard(
        revealPending(
          drawCardNumber({ ...g, pending: { stage: 'theme', themeId: 'theme-3', revealed: true } }),
        ),
        i,
      );
    }
    const r = deriveEffects(g).rules[0];
    expect(r).toMatchObject({ due: true, owner: 'a' });
    let res = resolutionFlow(g, r, draw(5));
    res = answerFlow(g, res, { ids: ['c'] }, draw(5));
    expect(stepView(g, res)).toMatchObject({ kind: 'malus', targets: ['c'] });
  });

  it('Le Roi / La Reine : 2 portions à répartir ; Retour de Karma : triple ; Communisme : tout le monde', () => {
    const roi = run(7, 2, [{}], 4, draw(8)).st;
    expect(stepView(game(4), roi)).toMatchObject({ kind: 'distribute', portions: 2, n: 8 });
    const karma = run(7, 7, [{}, {}], 4, draw(8)).st;
    expect(karma.effects).toEqual([{ k: 'malus', to: 'a', n: 8, mult: 3, via: undefined }]);
    const commu = run(7, 12, [{}, {}], 5, draw(8)).st;
    expect(commu.effects.map((e) => (e.k === 'malus' ? e.to : ''))).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('Inversion du temps : le malus va au joueur qui a joué juste avant', () => {
    let g = game(4);
    g = completeCard(
      revealPending(
        drawCardNumber({ ...g, pending: { stage: 'theme', themeId: 'theme-3', revealed: true } }),
      ),
      1,
    );
    let st = startFlow(g, card(7, 18).flow!, 'b', 'card', undefined, draw(4));
    st = answerFlow(g, st, {}, draw(4));
    expect(stepView(g, st)).toMatchObject({ kind: 'malus', targets: ['a'] });
  });

  it('Roulette russe : chiffre pair = le voisin boit, impair = double pour moi', () => {
    const even = run(7, 13, [{ value: 6 }, {}], 4, draw(3)).st;
    expect(stepView(game(4), even)).toMatchObject({ kind: 'malus', targets: ['b'], mult: 1 });
    const odd = run(7, 13, [{ value: 7 }, {}], 4, draw(3)).st;
    expect(stepView(game(4), odd)).toMatchObject({ kind: 'malus', targets: ['a'], mult: 2 });
  });

  it("Épreuve d'adresse : réussi = je distribue ; raté = je prends le double", () => {
    const ok = run(7, 20, [{ id: 'yes' }, {}], 4, draw(5)).st;
    expect(stepView(game(4), ok)).toMatchObject({ kind: 'distribute', portions: 1 });
    const ko = run(7, 20, [{ id: 'no' }, {}], 4, draw(5)).st;
    expect(stepView(game(4), ko)).toMatchObject({ kind: 'malus', mult: 2, targets: ['a'] });
  });

  it('Quitte ou double : > 5 je distribue le double, ≤ 5 je prends le triple', () => {
    expect(stepView(game(4), run(10, 16, [{}], 4, draw(8)).st)).toMatchObject({
      kind: 'distribute',
      portions: 2,
    });
    expect(stepView(game(4), run(10, 16, [{}], 4, draw(5)).st)).toMatchObject({
      kind: 'malus',
      mult: 3,
    });
  });

  it("« Je n'ai jamais » : tous ceux qui l'ont fait boivent la même boisson", () => {
    const { st } = run(9, 1, [{ ids: ['a', 'c'] }, {}], 4, draw(12));
    expect(st.effects.map((e) => (e.k === 'malus' ? [e.to, e.n] : e.k))).toEqual([
      ['a', 12],
      ['c', 12],
    ]);
    const none = run(9, 1, [{ ids: [] }], 4, draw(12)).st;
    expect(none.effects).toEqual([]);
  });

  it('Tribunal : le désigné boit ; la plus séduisante distribue le malus', () => {
    expect(run(8, 3, [{ ids: ['d'] }, {}], 4, draw(2)).st.effects[0]).toMatchObject({ to: 'd' });
    const g = game(4);
    const st = run(8, 20, [{ ids: ['b'] }], 4, draw(2)).st;
    expect(stepView(g, st)).toMatchObject({ kind: 'distribute', portions: 1, by: 'b' });
  });

  it("Alliance ultime : crée un lien 50/50 jusqu'à la fin ; Pardon général efface tout", () => {
    const g0 = game(4);
    const al = answerFlow(g0, startFlow(g0, card(10, 18).flow!, 'a', 'card'), { ids: ['b'] });
    let g = addCarry(g0, al.effects);
    expect(deriveEffects(g).rules[0]).toMatchObject({ link: ['a', 'b'], subjects: ['a', 'b'] });
    const pardon = startFlow(g, card(10, 19).flow!, 'c', 'card');
    g = addCarry(g, pardon.effects);
    expect(deriveEffects(g).rules).toEqual([]);
  });

  it('Contraintes de communication (thème 5) : règle de 3 tours sur le joueur', () => {
    const g0 = game(4);
    const st = startFlow(g0, card(5, 12).flow!, 'a', 'card');
    const r = st.effects[0];
    expect(r.k === 'rule' && r.rule).toMatchObject({ turns: 3, subjects: ['a'], owner: 'a' });
  });
});
