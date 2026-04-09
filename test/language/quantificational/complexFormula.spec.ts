import { ComplexFormulaImpl } from '../../../src/language/quantificational/complexFormula';
import { AtomicFormulaImpl } from '../../../src/language/quantificational/atomicFormula';
import { PredicateImpl } from '../../../src/language/quantificational/predicate';
import { ConstantTerm } from '../../../src/language/quantificational/term';
import { VariableAssignment, BinaryOperator } from '../../../src/language/quantificational/quantificationalTypes';
import { binaryOperatorToLogic } from '../../../src/language/quantificational/quantificationalUtils';

// Helper to create an atomic formula that always returns a fixed boolean.
function fixedAtom(val: boolean): AtomicFormulaImpl {
  const P = new PredicateImpl('P', 1, () => val);
  return new AtomicFormulaImpl(undefined, P, [new ConstantTerm('a')], new Map());
}

describe('ComplexFormula Tests', () => {

  test('should apply unary operators to values', () => {
    let complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '&', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl('~', fixedAtom(true), '&', fixedAtom(true));
    expect(complex.value()).toBe(false);
  });

  test('should apply logical AND correctly', () => {
    let complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '&', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '&', fixedAtom(false));
    expect(complex.value()).toBe(false);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '&', fixedAtom(true));
    expect(complex.value()).toBe(false);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '&', fixedAtom(false));
    expect(complex.value()).toBe(false);
  });

  test('should apply logical OR correctly', () => {
    let complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '|', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '|', fixedAtom(false));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '|', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '|', fixedAtom(false));
    expect(complex.value()).toBe(false);
  });

  test('should apply logical MATERIAL IMPLICATION correctly', () => {
    let complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '->', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '->', fixedAtom(false));
    expect(complex.value()).toBe(false);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '->', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '->', fixedAtom(false));
    expect(complex.value()).toBe(true);
  });

  test('should apply logical BICONDITIONAL correctly', () => {
    let complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '<->', fixedAtom(true));
    expect(complex.value()).toBe(true);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(true), '<->', fixedAtom(false));
    expect(complex.value()).toBe(false);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '<->', fixedAtom(true));
    expect(complex.value()).toBe(false);
    complex = new ComplexFormulaImpl(undefined, fixedAtom(false), '<->', fixedAtom(false));
    expect(complex.value()).toBe(true);
  });

  describe('inductive step — all (op, L, R) combinations with and without negation', () => {
    const operators: BinaryOperator[] = ['&', '|', '->', '<->'];
    const boolPairs: [boolean, boolean][] = [[false,false],[false,true],[true,false],[true,true]];

    operators.forEach(op => {
      describe(`binary operator '${op}'`, () => {
        boolPairs.forEach(([L, R]) => {
          const expected = binaryOperatorToLogic[op](L, R);

          test(`value() of (${L} ${op} ${R}) = ${expected}`, () => {
            const complex = new ComplexFormulaImpl(undefined, fixedAtom(L), op, fixedAtom(R));
            expect(complex.value()).toBe(expected);
          });

          test(`value() of ~(${L} ${op} ${R}) = ${!expected}`, () => {
            const complex = new ComplexFormulaImpl('~', fixedAtom(L), op, fixedAtom(R));
            expect(complex.value()).toBe(!expected);
          });
        });
      });
    });
  });

  test('nesting: (A & B) | C', () => {
    const inner = new ComplexFormulaImpl(undefined, fixedAtom(true), '&', fixedAtom(false));
    const outer = new ComplexFormulaImpl(undefined, inner, '|', fixedAtom(true));
    expect(outer.value()).toBe(true); // (T&F)|T = F|T = T
  });

  test('nesting: ~((A | B) -> C)', () => {
    const inner1 = new ComplexFormulaImpl(undefined, fixedAtom(true), '|', fixedAtom(false));
    const inner2 = new ComplexFormulaImpl(undefined, inner1, '->', fixedAtom(false));
    const negated = new ComplexFormulaImpl('~', inner1, '->', fixedAtom(false));
    expect(inner2.value()).toBe(false); // (T|F)->F = T->F = F
    expect(negated.value()).toBe(true); // ~((T|F)->F) = ~F = T
  });
});
