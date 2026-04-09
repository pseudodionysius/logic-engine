import { ModalAtomImpl } from '../../../src/language/modal/modalAtom';
import { ModalComplexImpl } from '../../../src/language/modal/modalComplex';
import { ModalFormulaImpl } from '../../../src/language/modal/modalFormula';
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

describe('ModalFormulaImpl — □ (necessity)', () => {

  test('□p is true when p is true at all accessible worlds', () => {
    const state = makeState('w0', { p: ['w0', 'w1', 'w2'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    // w0 can see w1 and w2
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    expect(boxP.value()).toBe(true);
  });

  test('□p is false when p is false at some accessible world', () => {
    const state = makeState('w0', { p: ['w0', 'w1'] }); // p false at w2
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    expect(boxP.value()).toBe(false);
  });

  test('□p is vacuously true when no worlds are accessible', () => {
    const state = makeState('w0', { p: [] }); // p false everywhere
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = () => false; // no accessibility

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    expect(boxP.value()).toBe(true);
  });

  test('□p restores current world after evaluation', () => {
    const state = makeState('w0', { p: ['w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = (from: World, to: World) => from === 'w0' && to === 'w1';

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    boxP.value();
    expect(state.currentWorld).toBe('w0');
  });
});

describe('ModalFormulaImpl — ◇ (possibility)', () => {

  test('◇p is true when p is true at some accessible world', () => {
    const state = makeState('w0', { p: ['w2'] }); // p only true at w2
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, R, state);
    expect(diaP.value()).toBe(true);
  });

  test('◇p is false when p is false at all accessible worlds', () => {
    const state = makeState('w0', { p: ['w0'] }); // p only true at w0 (not accessible from w0)
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, R, state);
    expect(diaP.value()).toBe(false);
  });

  test('◇p is false when no worlds are accessible', () => {
    const state = makeState('w0', { p: ['w0', 'w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = () => false;

    const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, R, state);
    expect(diaP.value()).toBe(false);
  });

  test('◇p restores current world after evaluation', () => {
    const state = makeState('w0', { p: ['w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = (from: World, to: World) => from === 'w0' && to === 'w1';

    const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, R, state);
    diaP.value();
    expect(state.currentWorld).toBe('w0');
  });
});

describe('ModalFormulaImpl — negation', () => {

  test('~□p negates the box result', () => {
    const state = makeState('w0', { p: ['w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = (from: World, to: World) => from === 'w0' && to === 'w1';

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    const negBoxP = new ModalFormulaImpl('~', '□', p, worlds, R, state);
    expect(negBoxP.value()).toBe(!boxP.value());
  });

  test('~◇p negates the diamond result', () => {
    const state = makeState('w0', { p: ['w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1'];
    const R = (from: World, to: World) => from === 'w0' && to === 'w1';

    const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, R, state);
    const negDiaP = new ModalFormulaImpl('~', '◇', p, worlds, R, state);
    expect(negDiaP.value()).toBe(!diaP.value());
  });
});

describe('ModalFormulaImpl — nested modalities', () => {

  test('□□p evaluates over two levels of accessibility', () => {
    // w0 → w1 → w2, p true everywhere
    const state = makeState('w0', { p: ['w0', 'w1', 'w2'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) =>
      (from === 'w0' && to === 'w1') || (from === 'w1' && to === 'w2');

    const innerBox = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    const outerBox = new ModalFormulaImpl(undefined, '□', innerBox, worlds, R, state);

    // □□p at w0: accessible from w0 is {w1}, at w1 accessible is {w2}, p@w2=true → true
    expect(outerBox.value()).toBe(true);
  });

  test('□□p fails when inner world lacks p', () => {
    // w0 → w1 → w2, p false at w2
    const state = makeState('w0', { p: ['w0', 'w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) =>
      (from === 'w0' && to === 'w1') || (from === 'w1' && to === 'w2');

    const innerBox = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    const outerBox = new ModalFormulaImpl(undefined, '□', innerBox, worlds, R, state);

    // □□p at w0: need □p at w1, which needs p at w2 — p false at w2 → false
    expect(outerBox.value()).toBe(false);
  });

  test('◇□p: possibly necessarily p', () => {
    // w0 → w1, w0 → w2; from w1 accessible: w1 (reflexive); from w2 accessible: w2
    // p true at w1, false at w2
    const state = makeState('w0', { p: ['w1'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) =>
      (from === 'w0' && (to === 'w1' || to === 'w2')) ||
      (from === 'w1' && to === 'w1') ||
      (from === 'w2' && to === 'w2');

    const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, R, state);
    const diaBoxP = new ModalFormulaImpl(undefined, '◇', boxP, worlds, R, state);

    // ◇□p at w0: need □p at w1 or □p at w2
    // □p at w1: accessible from w1 is {w1}, p@w1=true → true
    // So ◇□p is true
    expect(diaBoxP.value()).toBe(true);
  });
});

describe('ModalFormulaImpl — complex body', () => {

  test('□(p -> q) evaluates the implication at each accessible world', () => {
    // p -> q should be true at all accessible worlds
    const state = makeState('w0', { p: ['w1'], q: ['w1', 'w2'] });
    const p = new ModalAtomImpl(undefined, 'p', state);
    const q = new ModalAtomImpl(undefined, 'q', state);
    const impl = new ModalComplexImpl(undefined, p, '->', q);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const boxImpl = new ModalFormulaImpl(undefined, '□', impl, worlds, R, state);
    // w1: p=true, q=true → true; w2: p=false, q=true → true
    expect(boxImpl.value()).toBe(true);
  });

  test('□(p & q) requires both at every accessible world', () => {
    const state = makeState('w0', { p: ['w1', 'w2'], q: ['w1'] }); // q false at w2
    const p = new ModalAtomImpl(undefined, 'p', state);
    const q = new ModalAtomImpl(undefined, 'q', state);
    const conj = new ModalComplexImpl(undefined, p, '&', q);
    const worlds: World[] = ['w0', 'w1', 'w2'];
    const R = (from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2');

    const boxConj = new ModalFormulaImpl(undefined, '□', conj, worlds, R, state);
    // w1: p&q = true; w2: p&q = false → false
    expect(boxConj.value()).toBe(false);
  });
});
