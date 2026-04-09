import { AtomicFormulaImpl } from '../../../src/language/quantificational/atomicFormula';
import { PredicateImpl } from '../../../src/language/quantificational/predicate';
import { VariableTerm, ConstantTerm } from '../../../src/language/quantificational/term';
import { VariableAssignment } from '../../../src/language/quantificational/quantificationalTypes';

describe('AtomicFormula Tests', () => {

  describe('evaluation with constants', () => {

    test('F(a) evaluates to true when predicate holds for constant', () => {
      const mortals = new Set(['socrates']);
      const Mortal = new PredicateImpl('Mortal', 1, (x) => mortals.has(x as string));
      const a = new ConstantTerm('socrates');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl(undefined, Mortal, [a], assignment);
      expect(formula.value()).toBe(true);
    });

    test('F(a) evaluates to false when predicate does not hold', () => {
      const mortals = new Set(['socrates']);
      const Mortal = new PredicateImpl('Mortal', 1, (x) => mortals.has(x as string));
      const a = new ConstantTerm('zeus');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl(undefined, Mortal, [a], assignment);
      expect(formula.value()).toBe(false);
    });

    test('R(a, b) binary predicate with constants', () => {
      const Loves = new PredicateImpl('Loves', 2, (x, y) => x === 'socrates' && y === 'plato');
      const a = new ConstantTerm('socrates');
      const b = new ConstantTerm('plato');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl(undefined, Loves, [a, b], assignment);
      expect(formula.value()).toBe(true);
    });
  });

  describe('evaluation with variables', () => {

    test('F(x) evaluates relative to current assignment', () => {
      const mortals = new Set(['socrates', 'plato']);
      const Mortal = new PredicateImpl('Mortal', 1, (x) => mortals.has(x as string));
      const x = new VariableTerm('x');
      const assignment: VariableAssignment = new Map([['x', 'socrates']]);

      const formula = new AtomicFormulaImpl(undefined, Mortal, [x], assignment);
      expect(formula.value()).toBe(true);

      assignment.set('x', 'zeus');
      expect(formula.value()).toBe(false);
    });

    test('R(x, y) evaluates relative to both variable assignments', () => {
      const LessThan = new PredicateImpl('LessThan', 2, (a, b) => (a as number) < (b as number));
      const x = new VariableTerm('x');
      const y = new VariableTerm('y');
      const assignment: VariableAssignment = new Map([['x', 1], ['y', 2]]);

      const formula = new AtomicFormulaImpl(undefined, LessThan, [x, y], assignment);
      expect(formula.value()).toBe(true);

      assignment.set('x', 3);
      expect(formula.value()).toBe(false);
    });

    test('mixed terms: R(a, x) with constant and variable', () => {
      const Loves = new PredicateImpl('Loves', 2, (a, b) => a === 'socrates' && b === 'plato');
      const a = new ConstantTerm('socrates');
      const x = new VariableTerm('x');
      const assignment: VariableAssignment = new Map([['x', 'plato']]);

      const formula = new AtomicFormulaImpl(undefined, Loves, [a, x], assignment);
      expect(formula.value()).toBe(true);

      assignment.set('x', 'aristotle');
      expect(formula.value()).toBe(false);
    });
  });

  describe('negation', () => {

    test('~F(a) negates the predicate result', () => {
      const F = new PredicateImpl('F', 1, () => true);
      const a = new ConstantTerm('a');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl('~', F, [a], assignment);
      expect(formula.value()).toBe(false);
    });

    test('~F(a) where predicate is false yields true', () => {
      const F = new PredicateImpl('F', 1, () => false);
      const a = new ConstantTerm('a');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl('~', F, [a], assignment);
      expect(formula.value()).toBe(true);
    });

    test('undefined unary operator leaves value unchanged', () => {
      const F = new PredicateImpl('F', 1, () => true);
      const a = new ConstantTerm('a');
      const assignment: VariableAssignment = new Map();

      const pos = new AtomicFormulaImpl(undefined, F, [a], assignment);
      const neg = new AtomicFormulaImpl('~', F, [a], assignment);
      expect(pos.value()).toBe(!neg.value());
    });
  });

  describe('all rows of unary predicate truth table', () => {

    test('F(x) produces correct truth value for each domain element', () => {
      const domain = ['a', 'b', 'c'];
      const trueSet = new Set(['a', 'c']);
      const F = new PredicateImpl('F', 1, (x) => trueSet.has(x as string));
      const x = new VariableTerm('x');
      const assignment: VariableAssignment = new Map();

      const formula = new AtomicFormulaImpl(undefined, F, [x], assignment);
      const expected = [true, false, true];

      domain.forEach((d, i) => {
        assignment.set('x', d);
        expect(formula.value()).toBe(expected[i]);
      });
    });
  });
});
