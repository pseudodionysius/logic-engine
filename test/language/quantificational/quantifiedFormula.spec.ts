import { QuantifiedFormulaImpl } from '../../../src/language/quantificational/quantifiedFormula';
import { AtomicFormulaImpl } from '../../../src/language/quantificational/atomicFormula';
import { ComplexFormulaImpl } from '../../../src/language/quantificational/complexFormula';
import { PredicateImpl } from '../../../src/language/quantificational/predicate';
import { VariableTerm, ConstantTerm } from '../../../src/language/quantificational/term';
import { VariableAssignment, DomainElement } from '../../../src/language/quantificational/quantificationalTypes';

describe('QuantifiedFormula Tests', () => {

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function makeUnarySetup(trueElements: DomainElement[], domain: DomainElement[]) {
    const trueSet = new Set(trueElements);
    const assignment: VariableAssignment = new Map();
    const F = new PredicateImpl('F', 1, (x) => trueSet.has(x));
    const x = new VariableTerm('x');
    const body = new AtomicFormulaImpl(undefined, F, [x], assignment);
    return { assignment, F, body, domain };
  }

  // ─── Universal quantifier (∀) ────────────────────────────────────────────

  describe('universal quantifier (∀)', () => {

    test('∀x.F(x) true when predicate holds for ALL domain elements', () => {
      const domain = ['a', 'b', 'c'];
      const { assignment, body } = makeUnarySetup(['a', 'b', 'c'], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('∀x.F(x) false when predicate fails for at least one element', () => {
      const domain = ['a', 'b', 'c'];
      const { assignment, body } = makeUnarySetup(['a', 'b'], domain); // 'c' is not in trueSet

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });

    test('∀x.F(x) true on a single-element domain where predicate holds', () => {
      const domain = ['a'];
      const { assignment, body } = makeUnarySetup(['a'], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('∀x.F(x) false on a single-element domain where predicate fails', () => {
      const domain = ['a'];
      const { assignment, body } = makeUnarySetup([], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });
  });

  // ─── Existential quantifier (∃) ──────────────────────────────────────────

  describe('existential quantifier (∃)', () => {

    test('∃x.F(x) true when predicate holds for at least one element', () => {
      const domain = ['a', 'b', 'c'];
      const { assignment, body } = makeUnarySetup(['b'], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('∃x.F(x) false when predicate holds for NO element', () => {
      const domain = ['a', 'b', 'c'];
      const { assignment, body } = makeUnarySetup([], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });

    test('∃x.F(x) true when predicate holds for ALL elements', () => {
      const domain = ['a', 'b'];
      const { assignment, body } = makeUnarySetup(['a', 'b'], domain);

      const formula = new QuantifiedFormulaImpl(undefined, '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });
  });

  // ─── Negation ────────────────────────────────────────────────────────────

  describe('negation of quantified formulas', () => {

    test('~∀x.F(x) is true when ∀x.F(x) is false', () => {
      const domain = ['a', 'b'];
      const { assignment, body } = makeUnarySetup(['a'], domain);

      const formula = new QuantifiedFormulaImpl('~', '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('~∀x.F(x) is false when ∀x.F(x) is true', () => {
      const domain = ['a', 'b'];
      const { assignment, body } = makeUnarySetup(['a', 'b'], domain);

      const formula = new QuantifiedFormulaImpl('~', '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });

    test('~∃x.F(x) is true when ∃x.F(x) is false', () => {
      const domain = ['a', 'b'];
      const { assignment, body } = makeUnarySetup([], domain);

      const formula = new QuantifiedFormulaImpl('~', '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('~∃x.F(x) is false when ∃x.F(x) is true', () => {
      const domain = ['a', 'b'];
      const { assignment, body } = makeUnarySetup(['a'], domain);

      const formula = new QuantifiedFormulaImpl('~', '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });
  });

  // ─── Nested quantifiers ──────────────────────────────────────────────────

  describe('nested quantifiers', () => {

    test('∀x.∃y.R(x,y) — for every x, there exists a y such that R(x,y)', () => {
      // Domain: {1, 2}
      // R(x,y) iff x <= y — for every x there is a y (namely y=2) where x<=y
      const domain: DomainElement[] = [1, 2];
      const assignment: VariableAssignment = new Map();
      const R = new PredicateImpl('R', 2, (x, y) => (x as number) <= (y as number));
      const xTerm = new VariableTerm('x');
      const yTerm = new VariableTerm('y');
      const Rxy = new AtomicFormulaImpl(undefined, R, [xTerm, yTerm], assignment);

      const existsY = new QuantifiedFormulaImpl(undefined, '∃', 'y', Rxy, domain, assignment);
      const forallX = new QuantifiedFormulaImpl(undefined, '∀', 'x', existsY, domain, assignment);

      expect(forallX.value()).toBe(true);
    });

    test('∃x.∀y.R(x,y) — there exists an x such that R(x,y) for all y', () => {
      // Domain: {1, 2}
      // R(x,y) iff x <= y — x=1 satisfies: 1<=1 and 1<=2
      const domain: DomainElement[] = [1, 2];
      const assignment: VariableAssignment = new Map();
      const R = new PredicateImpl('R', 2, (x, y) => (x as number) <= (y as number));
      const xTerm = new VariableTerm('x');
      const yTerm = new VariableTerm('y');
      const Rxy = new AtomicFormulaImpl(undefined, R, [xTerm, yTerm], assignment);

      const forallY = new QuantifiedFormulaImpl(undefined, '∀', 'y', Rxy, domain, assignment);
      const existsX = new QuantifiedFormulaImpl(undefined, '∃', 'x', forallY, domain, assignment);

      expect(existsX.value()).toBe(true);
    });

    test('∀x.∀y.(R(x,y) -> R(y,x)) — R is symmetric', () => {
      // Domain: {a, b}
      // R(x,y) iff x == y — this is symmetric
      const domain: DomainElement[] = ['a', 'b'];
      const assignment: VariableAssignment = new Map();
      const R = new PredicateImpl('R', 2, (x, y) => x === y);
      const xTerm = new VariableTerm('x');
      const yTerm = new VariableTerm('y');
      const Rxy = new AtomicFormulaImpl(undefined, R, [xTerm, yTerm], assignment);
      const Ryx = new AtomicFormulaImpl(undefined, R, [yTerm, xTerm], assignment);
      const impl = new ComplexFormulaImpl(undefined, Rxy, '->', Ryx);

      const forallY = new QuantifiedFormulaImpl(undefined, '∀', 'y', impl, domain, assignment);
      const forallX = new QuantifiedFormulaImpl(undefined, '∀', 'x', forallY, domain, assignment);

      expect(forallX.value()).toBe(true);
    });

    test('nested quantifiers restore previous bindings', () => {
      // Verify that after ∀x.∃y.R(x,y) completes, x is unbound again
      const domain: DomainElement[] = [1, 2];
      const assignment: VariableAssignment = new Map();
      const R = new PredicateImpl('R', 2, (x, y) => (x as number) <= (y as number));
      const Rxy = new AtomicFormulaImpl(undefined, R, [new VariableTerm('x'), new VariableTerm('y')], assignment);
      const existsY = new QuantifiedFormulaImpl(undefined, '∃', 'y', Rxy, domain, assignment);
      const forallX = new QuantifiedFormulaImpl(undefined, '∀', 'x', existsY, domain, assignment);

      forallX.value();
      expect(assignment.has('x')).toBe(false);
      expect(assignment.has('y')).toBe(false);
    });
  });

  // ─── Quantifier–connective interaction ────────────────────────────────────

  describe('quantifier–connective interaction', () => {

    test('∀x.F(x) & ∃x.G(x) — conjunction of quantified formulas', () => {
      const domain: DomainElement[] = ['a', 'b'];
      const assignment: VariableAssignment = new Map();
      const F = new PredicateImpl('F', 1, () => true); // F holds everywhere
      const G = new PredicateImpl('G', 1, (x) => x === 'a'); // G holds only for 'a'
      const xTerm = new VariableTerm('x');

      const Fx = new AtomicFormulaImpl(undefined, F, [xTerm], assignment);
      const Gx = new AtomicFormulaImpl(undefined, G, [xTerm], assignment);

      const forallFx = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx, domain, assignment);
      const existsGx = new QuantifiedFormulaImpl(undefined, '∃', 'x', Gx, domain, assignment);
      const conjunction = new ComplexFormulaImpl(undefined, forallFx, '&', existsGx);

      expect(conjunction.value()).toBe(true);
    });

    test('∀x.(F(x) -> G(x)) — quantifier scopes over connective', () => {
      // "All Fs are Gs": F = {a, b}, G = {a, b, c} → true
      const domain: DomainElement[] = ['a', 'b', 'c'];
      const assignment: VariableAssignment = new Map();
      const fs = new Set(['a', 'b']);
      const gs = new Set(['a', 'b', 'c']);
      const F = new PredicateImpl('F', 1, (x) => fs.has(x as string));
      const G = new PredicateImpl('G', 1, (x) => gs.has(x as string));
      const xTerm = new VariableTerm('x');

      const Fx = new AtomicFormulaImpl(undefined, F, [xTerm], assignment);
      const Gx = new AtomicFormulaImpl(undefined, G, [xTerm], assignment);
      const impl = new ComplexFormulaImpl(undefined, Fx, '->', Gx);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, domain, assignment);
      expect(formula.value()).toBe(true);
    });

    test('∀x.(F(x) -> G(x)) fails when an F is not a G', () => {
      // "All Fs are Gs": F = {a, b}, G = {a} → false (b is F but not G)
      const domain: DomainElement[] = ['a', 'b'];
      const assignment: VariableAssignment = new Map();
      const fs = new Set(['a', 'b']);
      const gs = new Set(['a']);
      const F = new PredicateImpl('F', 1, (x) => fs.has(x as string));
      const G = new PredicateImpl('G', 1, (x) => gs.has(x as string));
      const xTerm = new VariableTerm('x');

      const Fx = new AtomicFormulaImpl(undefined, F, [xTerm], assignment);
      const Gx = new AtomicFormulaImpl(undefined, G, [xTerm], assignment);
      const impl = new ComplexFormulaImpl(undefined, Fx, '->', Gx);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, domain, assignment);
      expect(formula.value()).toBe(false);
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {

    test('empty domain: ∀x.F(x) is vacuously true', () => {
      const domain: DomainElement[] = [];
      const assignment: VariableAssignment = new Map();
      const F = new PredicateImpl('F', 1, () => false);
      const body = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);

      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);
      expect(formula.value()).toBe(true); // vacuous truth
    });

    test('empty domain: ∃x.F(x) is false', () => {
      const domain: DomainElement[] = [];
      const assignment: VariableAssignment = new Map();
      const F = new PredicateImpl('F', 1, () => true);
      const body = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);

      const formula = new QuantifiedFormulaImpl(undefined, '∃', 'x', body, domain, assignment);
      expect(formula.value()).toBe(false);
    });
  });
});
