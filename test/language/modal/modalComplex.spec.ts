import { ModalAtomImpl } from '../../../src/language/modal/modalAtom';
import { ModalComplexImpl } from '../../../src/language/modal/modalComplex';
import { ModalEvaluationState, BinaryOperator, World } from '../../../src/language/modal/modalTypes';
import { binaryOperatorToLogic } from '../../../src/language/modal/modalUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(currentWorld: World, valuation: Record<string, World[]>): ModalEvaluationState {
  const map = new Map<string, Set<World>>();
  for (const [prop, worlds] of Object.entries(valuation)) {
    map.set(prop, new Set(worlds));
  }
  return { currentWorld, valuation: map };
}

function fixedAtom(state: ModalEvaluationState, val: boolean): ModalAtomImpl {
  // Use a unique prop name with pre-set extension
  const name = `_fixed_${val}`;
  if (val) {
    state.valuation.set(name, new Set([state.currentWorld]));
  } else {
    state.valuation.set(name, new Set());
  }
  return new ModalAtomImpl(undefined, name, state);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalComplexImpl', () => {

  describe('all rows of each binary operator truth table', () => {

    const operators: BinaryOperator[] = ['&', '|', '->', '<->'];
    const boolPairs: [boolean, boolean][] = [[false,false],[false,true],[true,false],[true,true]];

    operators.forEach(op => {
      boolPairs.forEach(([L, R]) => {
        const expected = binaryOperatorToLogic[op](L, R);

        test(`(${L} ${op} ${R}) = ${expected}`, () => {
          const state = makeState('w0', {});
          const left = fixedAtom(state, L);
          const right = fixedAtom(state, R);
          expect(new ModalComplexImpl(undefined, left, op, right).value()).toBe(expected);
        });

        test(`~(${L} ${op} ${R}) = ${!expected}`, () => {
          const state = makeState('w0', {});
          const left = fixedAtom(state, L);
          const right = fixedAtom(state, R);
          expect(new ModalComplexImpl('~', left, op, right).value()).toBe(!expected);
        });
      });
    });
  });

  describe('world-relative evaluation', () => {

    test('p & q evaluates relative to current world', () => {
      // p true at w0, q true at w0
      const state = makeState('w0', { p: ['w0'], q: ['w0', 'w1'] });
      const p = new ModalAtomImpl(undefined, 'p', state);
      const q = new ModalAtomImpl(undefined, 'q', state);
      const conj = new ModalComplexImpl(undefined, p, '&', q);

      expect(conj.value()).toBe(true);

      // Move to w1: p false, q true
      state.currentWorld = 'w1';
      expect(conj.value()).toBe(false);
    });

    test('p -> q evaluates correctly across worlds', () => {
      const state = makeState('w0', { p: ['w0', 'w1'], q: ['w0'] });
      const p = new ModalAtomImpl(undefined, 'p', state);
      const q = new ModalAtomImpl(undefined, 'q', state);
      const impl = new ModalComplexImpl(undefined, p, '->', q);

      // w0: p=true, q=true → true
      expect(impl.value()).toBe(true);

      // w1: p=true, q=false → false
      state.currentWorld = 'w1';
      expect(impl.value()).toBe(false);
    });
  });
});
