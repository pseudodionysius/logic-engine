import { ModalAtomImpl } from '../../../src/language/modal/modalAtom';
import { ModalEvaluationState, World } from '../../../src/language/modal/modalTypes';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(currentWorld: World, valuation: Record<string, World[]>): ModalEvaluationState {
  const map = new Map<string, Set<World>>();
  for (const [prop, worlds] of Object.entries(valuation)) {
    map.set(prop, new Set(worlds));
  }
  return { currentWorld, valuation: map };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalAtomImpl', () => {

  describe('evaluation at current world', () => {

    test('p is true when current world is in the extension of p', () => {
      const state = makeState('w0', { p: ['w0', 'w1'] });
      const atom = new ModalAtomImpl(undefined, 'p', state);
      expect(atom.value()).toBe(true);
    });

    test('p is false when current world is not in the extension of p', () => {
      const state = makeState('w2', { p: ['w0', 'w1'] });
      const atom = new ModalAtomImpl(undefined, 'p', state);
      expect(atom.value()).toBe(false);
    });

    test('p is false when proposition has no extension entry', () => {
      const state = makeState('w0', {});
      const atom = new ModalAtomImpl(undefined, 'p', state);
      expect(atom.value()).toBe(false);
    });

    test('p is false when extension is empty', () => {
      const state = makeState('w0', { p: [] });
      const atom = new ModalAtomImpl(undefined, 'p', state);
      expect(atom.value()).toBe(false);
    });
  });

  describe('world-relative truth', () => {

    test('same atom gives different values at different worlds', () => {
      const state = makeState('w0', { p: ['w0'] });
      const atom = new ModalAtomImpl(undefined, 'p', state);

      expect(atom.value()).toBe(true);

      state.currentWorld = 'w1';
      expect(atom.value()).toBe(false);
    });

    test('different propositions can have different extensions', () => {
      const state = makeState('w0', { p: ['w0'], q: ['w1'] });
      const atomP = new ModalAtomImpl(undefined, 'p', state);
      const atomQ = new ModalAtomImpl(undefined, 'q', state);

      expect(atomP.value()).toBe(true);
      expect(atomQ.value()).toBe(false);
    });
  });

  describe('negation', () => {

    test('~p negates the truth value', () => {
      const state = makeState('w0', { p: ['w0'] });
      const atom = new ModalAtomImpl('~', 'p', state);
      expect(atom.value()).toBe(false);
    });

    test('~p is true when p is false at current world', () => {
      const state = makeState('w1', { p: ['w0'] });
      const atom = new ModalAtomImpl('~', 'p', state);
      expect(atom.value()).toBe(true);
    });

    test('undefined unary operator leaves value unchanged', () => {
      const state = makeState('w0', { p: ['w0'] });
      const pos = new ModalAtomImpl(undefined, 'p', state);
      const neg = new ModalAtomImpl('~', 'p', state);
      expect(pos.value()).toBe(!neg.value());
    });
  });

  describe('mutable state sharing', () => {

    test('updating valuation changes atom truth value', () => {
      const state = makeState('w0', { p: [] });
      const atom = new ModalAtomImpl(undefined, 'p', state);

      expect(atom.value()).toBe(false);

      state.valuation.set('p', new Set(['w0']));
      expect(atom.value()).toBe(true);
    });

    test('multiple atoms share the same state', () => {
      const state = makeState('w0', { p: ['w0', 'w1'] });
      const atom1 = new ModalAtomImpl(undefined, 'p', state);
      const atom2 = new ModalAtomImpl(undefined, 'p', state);

      expect(atom1.value()).toBe(atom2.value());

      state.currentWorld = 'w2';
      expect(atom1.value()).toBe(atom2.value());
    });
  });

  describe('exhaustive truth table over worlds', () => {

    test('p produces correct truth value for each world', () => {
      const worlds: World[] = ['w0', 'w1', 'w2'];
      const state = makeState('w0', { p: ['w0', 'w2'] });
      const atom = new ModalAtomImpl(undefined, 'p', state);
      const expected = [true, false, true];

      worlds.forEach((w, i) => {
        state.currentWorld = w;
        expect(atom.value()).toBe(expected[i]);
      });
    });
  });
});
