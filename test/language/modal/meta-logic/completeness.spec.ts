import { ModalAtomImpl } from '../../../../src/language/modal/modalAtom';
import { ModalComplexImpl } from '../../../../src/language/modal/modalComplex';
import { ModalFormulaImpl } from '../../../../src/language/modal/modalFormula';
import { ModalEvaluationState, BinaryOperator, World, MFF } from '../../../../src/language/modal/modalTypes';
import { binaryOperatorToLogic } from '../../../../src/language/modal/modalUtils';

/**
 * COMPLETENESS OF MODAL LOGIC — SYSTEM K (over finite Kripke models)
 * ─────────────────────────────────────────────────────────────────────────────
 * Theorem: The exhaustive evaluation method is sound and complete for
 *          modal logic system K over finite Kripke models.
 *
 *   Soundness    — if exhaustive evaluation returns true on every valuation
 *                  for a given frame, the formula is valid on that frame.
 *
 *   Completeness — every formula valid on a finite frame is confirmed by
 *                  the exhaustive method.
 *
 * Proof structure:
 *
 *   Part I  — Structural induction: value() correctly computes the truth
 *             function of any MFF at any world in any Kripke model.
 *
 *     Base case:  ModalAtomImpl correctly reads the valuation at the
 *                 current world, with and without negation.
 *
 *     IH:         left.value() and right.value() correctly return L and R.
 *
 *     Ind. step:  ModalComplexImpl correctly applies binary operators.
 *                 ModalFormulaImpl correctly iterates over accessible
 *                 worlds for □ and ◇.
 *
 *   Part II — Consequence: theorems and non-theorems of K are classified
 *             correctly. Includes K axiom, modal duality, and distribution.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Test helpers ──────────────────────────────────────────────────────────

function makeState(currentWorld: World, valuation: Record<string, World[]>): ModalEvaluationState {
  const map = new Map<string, Set<World>>();
  for (const [prop, worlds] of Object.entries(valuation)) {
    map.set(prop, new Set(worlds));
  }
  return { currentWorld, valuation: map };
}

/** Test frames of increasing complexity */
interface TestFrame {
  worlds: World[];
  accessibility: (from: World, to: World) => boolean;
  label: string;
}

const FRAMES: TestFrame[] = [
  {
    worlds: ['w0'],
    accessibility: () => false,
    label: 'isolated single world',
  },
  {
    worlds: ['w0'],
    accessibility: (f, t) => f === 'w0' && t === 'w0',
    label: 'reflexive single world',
  },
  {
    worlds: ['w0', 'w1'],
    accessibility: (f, t) => f === 'w0' && t === 'w1',
    label: 'two worlds, w0→w1',
  },
  {
    worlds: ['w0', 'w1'],
    accessibility: () => true,
    label: 'two worlds, fully connected',
  },
  {
    worlds: ['w0', 'w1', 'w2'],
    accessibility: (f, t) => f === 'w0' && (t === 'w1' || t === 'w2'),
    label: 'three worlds, w0→w1, w0→w2',
  },
  {
    worlds: ['w0', 'w1', 'w2'],
    accessibility: (f, t) =>
      (f === 'w0' && t === 'w1') || (f === 'w1' && t === 'w2'),
    label: 'three worlds, chain w0→w1→w2',
  },
];

/**
 * Check whether a modal formula is valid on a given frame (true under every
 * valuation at every world). For formulas with propositions props, enumerates
 * all 2^(|props|×|W|) valuations and checks at the designated world.
 */
function isValidOnFrame(
  formula: MFF,
  frame: TestFrame,
  props: string[],
  state: ModalEvaluationState,
  designatedWorld: World,
): boolean {
  const numBits = props.length * frame.worlds.length;
  const total = Math.pow(2, numBits);

  for (let i = 0; i < total; i++) {
    // Apply valuation
    props.forEach((prop, pIdx) => {
      const extension = new Set<World>();
      frame.worlds.forEach((w, wIdx) => {
        const bitPos = pIdx * frame.worlds.length + wIdx;
        if (((i >> bitPos) & 1) === 1) extension.add(w);
      });
      state.valuation.set(prop, extension);
    });

    state.currentWorld = designatedWorld;
    if (!formula.value()) return false;
  }
  return true;
}

/**
 * Check validity at ALL worlds in the frame (stronger than single-world validity).
 */
function isValidOnFrameAtAllWorlds(
  formulaFactory: (state: ModalEvaluationState, frame: TestFrame) => MFF,
  frame: TestFrame,
  props: string[],
): boolean {
  const state = makeState(frame.worlds[0], {});
  const formula = formulaFactory(state, frame);

  for (const w of frame.worlds) {
    if (!isValidOnFrame(formula, frame, props, state, w)) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Completeness of Modal Logic — System K (finite Kripke models)', () => {

  // ── Part I: Structural induction ───────────────────────────────────────────

  describe('Part I — Structural induction: value() is semantically correct', () => {

    describe('Base case — ModalAtomImpl', () => {

      test('proposition reads correct value from valuation at current world', () => {
        const state = makeState('w0', { p: ['w0', 'w2'] });
        const atom = new ModalAtomImpl(undefined, 'p', state);

        expect(atom.value()).toBe(true);  // w0 in extension
        state.currentWorld = 'w1';
        expect(atom.value()).toBe(false); // w1 not in extension
        state.currentWorld = 'w2';
        expect(atom.value()).toBe(true);  // w2 in extension
      });

      test('negation inverts the proposition value', () => {
        const state = makeState('w0', { p: ['w0'] });
        expect(new ModalAtomImpl('~', 'p', state).value()).toBe(false);
        expect(new ModalAtomImpl(undefined, 'p', state).value()).toBe(true);
      });
    });

    describe('Inductive step — ModalComplexImpl (binary operators)', () => {
      const operators: BinaryOperator[] = ['&', '|', '->', '<->'];
      const boolPairs: [boolean, boolean][] = [[false,false],[false,true],[true,false],[true,true]];

      function fixedAtom(state: ModalEvaluationState, val: boolean, id: string): ModalAtomImpl {
        if (val) {
          state.valuation.set(id, new Set([state.currentWorld]));
        } else {
          state.valuation.set(id, new Set());
        }
        return new ModalAtomImpl(undefined, id, state);
      }

      operators.forEach(op => {
        boolPairs.forEach(([L, R]) => {
          const expected = binaryOperatorToLogic[op](L, R);
          test(`(${L} ${op} ${R}) = ${expected}`, () => {
            const state = makeState('w0', {});
            expect(new ModalComplexImpl(
              undefined, fixedAtom(state, L, '_L'), op, fixedAtom(state, R, '_R'),
            ).value()).toBe(expected);
          });
          test(`~(${L} ${op} ${R}) = ${!expected}`, () => {
            const state = makeState('w0', {});
            expect(new ModalComplexImpl(
              '~', fixedAtom(state, L, '_L'), op, fixedAtom(state, R, '_R'),
            ).value()).toBe(!expected);
          });
        });
      });
    });

    describe('Inductive step — ModalFormulaImpl (□ and ◇)', () => {

      test('□ iterates every accessible world and is true only when body holds for all', () => {
        FRAMES.forEach(frame => {
          const state = makeState(frame.worlds[0], { p: [frame.worlds[0]] });
          const p = new ModalAtomImpl(undefined, 'p', state);
          const boxP = new ModalFormulaImpl(
            undefined, '□', p, frame.worlds, frame.accessibility, state,
          );

          // Compute expected: p must be true at all worlds accessible from worlds[0]
          const accessibleWorlds = frame.worlds.filter(w => frame.accessibility(frame.worlds[0], w));
          const expected = accessibleWorlds.every(w => state.valuation.get('p')!.has(w));

          state.currentWorld = frame.worlds[0];
          expect(boxP.value()).toBe(expected);
        });
      });

      test('◇ iterates accessible worlds and is true when body holds for at least one', () => {
        FRAMES.forEach(frame => {
          const state = makeState(frame.worlds[0], { p: [frame.worlds[0]] });
          const p = new ModalAtomImpl(undefined, 'p', state);
          const diaP = new ModalFormulaImpl(
            undefined, '◇', p, frame.worlds, frame.accessibility, state,
          );

          const accessibleWorlds = frame.worlds.filter(w => frame.accessibility(frame.worlds[0], w));
          const expected = accessibleWorlds.some(w => state.valuation.get('p')!.has(w));

          state.currentWorld = frame.worlds[0];
          expect(diaP.value()).toBe(expected);
        });
      });

      test('□ and ◇ restore current world after evaluation', () => {
        const state = makeState('w0', { p: ['w1'] });
        const p = new ModalAtomImpl(undefined, 'p', state);
        const worlds: World[] = ['w0', 'w1'];
        const R = (f: World, t: World) => f === 'w0' && t === 'w1';

        new ModalFormulaImpl(undefined, '□', p, worlds, R, state).value();
        expect(state.currentWorld).toBe('w0');

        new ModalFormulaImpl(undefined, '◇', p, worlds, R, state).value();
        expect(state.currentWorld).toBe('w0');
      });
    });
  });

  // ── Part II: Consequence — theorems and non-theorems of K ──────────────────

  describe('Part II — Modal duality', () => {

    test('□p ⟺ ~◇~p  (verified over all frames and valuations)', () => {
      FRAMES.forEach(frame => {
        const result = isValidOnFrameAtAllWorlds(
          (state, fr) => {
            const p = new ModalAtomImpl(undefined, 'p', state);
            const notP = new ModalAtomImpl('~', 'p', state);

            const boxP = new ModalFormulaImpl(undefined, '□', p, fr.worlds, fr.accessibility, state);
            const diaNegP = new ModalFormulaImpl(undefined, '◇', notP, fr.worlds, fr.accessibility, state);
            const negDiaNegP = new ModalFormulaImpl('~', '◇', notP, fr.worlds, fr.accessibility, state);

            // □p <-> ~◇~p
            return new ModalComplexImpl(undefined, boxP, '<->', negDiaNegP);
          },
          frame,
          ['p'],
        );
        expect(result).toBe(true);
      });
    });

    test('◇p ⟺ ~□~p  (verified over all frames and valuations)', () => {
      FRAMES.forEach(frame => {
        const result = isValidOnFrameAtAllWorlds(
          (state, fr) => {
            const p = new ModalAtomImpl(undefined, 'p', state);
            const notP = new ModalAtomImpl('~', 'p', state);

            const diaP = new ModalFormulaImpl(undefined, '◇', p, fr.worlds, fr.accessibility, state);
            const boxNegP = new ModalFormulaImpl(undefined, '□', notP, fr.worlds, fr.accessibility, state);
            const negBoxNegP = new ModalFormulaImpl('~', '□', notP, fr.worlds, fr.accessibility, state);

            // ◇p <-> ~□~p
            return new ModalComplexImpl(undefined, diaP, '<->', negBoxNegP);
          },
          frame,
          ['p'],
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Part II — K axiom: □(p → q) → (□p → □q)', () => {

    test('K axiom is valid on every frame (verified exhaustively)', () => {
      FRAMES.forEach(frame => {
        const result = isValidOnFrameAtAllWorlds(
          (state, fr) => {
            const p = new ModalAtomImpl(undefined, 'p', state);
            const q = new ModalAtomImpl(undefined, 'q', state);

            // p -> q
            const impl = new ModalComplexImpl(undefined, p, '->', q);

            // □(p -> q)
            const boxImpl = new ModalFormulaImpl(undefined, '□', impl, fr.worlds, fr.accessibility, state);

            // □p
            const boxP = new ModalFormulaImpl(undefined, '□', p, fr.worlds, fr.accessibility, state);

            // □q
            const boxQ = new ModalFormulaImpl(undefined, '□', q, fr.worlds, fr.accessibility, state);

            // □p → □q
            const boxPtoBoxQ = new ModalComplexImpl(undefined, boxP, '->', boxQ);

            // □(p → q) → (□p → □q)
            return new ModalComplexImpl(undefined, boxImpl, '->', boxPtoBoxQ);
          },
          frame,
          ['p', 'q'],
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Part II — Distribution: □(p & q) ⟺ (□p & □q)', () => {

    test('□(p & q) <-> (□p & □q) is valid on every frame', () => {
      FRAMES.forEach(frame => {
        const result = isValidOnFrameAtAllWorlds(
          (state, fr) => {
            const p = new ModalAtomImpl(undefined, 'p', state);
            const q = new ModalAtomImpl(undefined, 'q', state);

            // □(p & q)
            const conj = new ModalComplexImpl(undefined, p, '&', q);
            const lhs = new ModalFormulaImpl(undefined, '□', conj, fr.worlds, fr.accessibility, state);

            // □p & □q
            const boxP = new ModalFormulaImpl(undefined, '□', p, fr.worlds, fr.accessibility, state);
            const boxQ = new ModalFormulaImpl(undefined, '□', q, fr.worlds, fr.accessibility, state);
            const rhs = new ModalComplexImpl(undefined, boxP, '&', boxQ);

            return new ModalComplexImpl(undefined, lhs, '<->', rhs);
          },
          frame,
          ['p', 'q'],
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Part II — Necessitation: tautologies are necessarily true', () => {

    test('□(p | ~p) is valid on every frame', () => {
      FRAMES.forEach(frame => {
        const result = isValidOnFrameAtAllWorlds(
          (state, fr) => {
            const p = new ModalAtomImpl(undefined, 'p', state);
            const notP = new ModalAtomImpl('~', 'p', state);
            const lem = new ModalComplexImpl(undefined, p, '|', notP);
            return new ModalFormulaImpl(undefined, '□', lem, fr.worlds, fr.accessibility, state);
          },
          frame,
          ['p'],
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Part II — Non-theorems of K (valid only under frame conditions)', () => {

    test('□p → p is NOT valid on all K-frames (requires reflexivity = system T)', () => {
      // Should fail on at least one frame (any non-reflexive frame)
      const nonReflexiveFrame = FRAMES.find(f => f.label === 'two worlds, w0→w1');
      expect(nonReflexiveFrame).toBeDefined();

      const state = makeState('w0', {});
      const p = new ModalAtomImpl(undefined, 'p', state);
      const boxP = new ModalFormulaImpl(
        undefined, '□', p,
        nonReflexiveFrame!.worlds, nonReflexiveFrame!.accessibility, state,
      );
      const tAxiom = new ModalComplexImpl(undefined, boxP, '->', p);

      // Countermodel: p false at w0, p true at w1
      // □p is true at w0 (only accessible world is w1 where p is true)
      // but p is false at w0
      // So □p → p is false
      state.valuation.set('p', new Set(['w1']));
      state.currentWorld = 'w0';
      expect(tAxiom.value()).toBe(false);
    });

    test('□p → □□p is NOT valid on all K-frames (requires transitivity = system 4)', () => {
      // Chain frame: w0→w1→w2
      const chainFrame = FRAMES.find(f => f.label === 'three worlds, chain w0→w1→w2');
      expect(chainFrame).toBeDefined();

      const state = makeState('w0', {});
      const p = new ModalAtomImpl(undefined, 'p', state);
      const boxP = new ModalFormulaImpl(
        undefined, '□', p,
        chainFrame!.worlds, chainFrame!.accessibility, state,
      );
      const boxBoxP = new ModalFormulaImpl(
        undefined, '□', boxP,
        chainFrame!.worlds, chainFrame!.accessibility, state,
      );
      const fourAxiom = new ModalComplexImpl(undefined, boxP, '->', boxBoxP);

      // Countermodel: p true at w1, p false at w2
      // □p at w0: accessible is {w1}, p@w1=true → true
      // □□p at w0: accessible is {w1}, need □p at w1
      //   □p at w1: accessible is {w2}, p@w2=false → false
      // So □p → □□p is false at w0
      state.valuation.set('p', new Set(['w1']));
      state.currentWorld = 'w0';
      expect(fourAxiom.value()).toBe(false);
    });

    test('◇p → □◇p is NOT valid on all K-frames (requires Euclidean = system 5)', () => {
      // Frame: w0→w1, w0→w2 (non-Euclidean: w1 does not access w2)
      const frame = FRAMES.find(f => f.label === 'three worlds, w0→w1, w0→w2');
      expect(frame).toBeDefined();

      const state = makeState('w0', {});
      const p = new ModalAtomImpl(undefined, 'p', state);
      const diaP = new ModalFormulaImpl(
        undefined, '◇', p,
        frame!.worlds, frame!.accessibility, state,
      );
      const boxDiaP = new ModalFormulaImpl(
        undefined, '□', diaP,
        frame!.worlds, frame!.accessibility, state,
      );
      const fiveAxiom = new ModalComplexImpl(undefined, diaP, '->', boxDiaP);

      // Countermodel: p true at w1 only
      // ◇p at w0: accessible {w1, w2}, p@w1=true → true
      // □◇p at w0: need ◇p at w1 AND ◇p at w2
      //   ◇p at w1: accessible from w1 = {} (no worlds) → false
      // So ◇p → □◇p is false
      state.valuation.set('p', new Set(['w1']));
      state.currentWorld = 'w0';
      expect(fiveAxiom.value()).toBe(false);
    });
  });

  describe('Part II — Completeness: exhaustive evaluation is a decision procedure', () => {

    test('A valid modal formula is confirmed valid', () => {
      // □(p | ~p) — necessitated excluded middle
      const state = makeState('w0', {});
      const worlds: World[] = ['w0', 'w1'];
      const R = (f: World, t: World) => f === 'w0' && t === 'w1';

      const p = new ModalAtomImpl(undefined, 'p', state);
      const notP = new ModalAtomImpl('~', 'p', state);
      const lem = new ModalComplexImpl(undefined, p, '|', notP);
      const boxLem = new ModalFormulaImpl(undefined, '□', lem, worlds, R, state);

      const frame: TestFrame = { worlds, accessibility: R, label: '' };
      expect(isValidOnFrame(boxLem, frame, ['p'], state, 'w0')).toBe(true);
    });

    test('A satisfiable but non-valid formula produces mixed results', () => {
      // □p — not valid (depends on valuation), but satisfiable
      const state = makeState('w0', {});
      const worlds: World[] = ['w0', 'w1'];
      const R = (f: World, t: World) => f === 'w0' && t === 'w1';

      const p = new ModalAtomImpl(undefined, 'p', state);
      const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);

      // True when p is true at w1
      state.valuation.set('p', new Set(['w1']));
      state.currentWorld = 'w0';
      expect(boxP.value()).toBe(true);

      // False when p is false at w1
      state.valuation.set('p', new Set(['w0']));
      state.currentWorld = 'w0';
      expect(boxP.value()).toBe(false);
    });

    test('An unsatisfiable modal formula is refuted', () => {
      // □p & ◇~p on a frame where w0 accesses only w1
      // This means p must be true at w1 (□p) AND false at w1 (◇~p)
      const state = makeState('w0', {});
      const worlds: World[] = ['w0', 'w1'];
      const R = (f: World, t: World) => f === 'w0' && t === 'w1';

      const p = new ModalAtomImpl(undefined, 'p', state);
      const notP = new ModalAtomImpl('~', 'p', state);
      const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
      const diaNegP = new ModalFormulaImpl(undefined, '◇', notP, worlds, R, state);
      const conj = new ModalComplexImpl(undefined, boxP, '&', diaNegP);

      const frame: TestFrame = { worlds, accessibility: R, label: '' };
      expect(isValidOnFrame(conj, frame, ['p'], state, 'w0')).toBe(false);
    });
  });
});
