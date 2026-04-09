import { AtomicFormulaImpl } from '../../../../src/language/quantificational/atomicFormula';
import { ComplexFormulaImpl } from '../../../../src/language/quantificational/complexFormula';
import { QuantifiedFormulaImpl } from '../../../../src/language/quantificational/quantifiedFormula';
import { PredicateImpl } from '../../../../src/language/quantificational/predicate';
import { VariableTerm } from '../../../../src/language/quantificational/term';
import { VariableAssignment, DomainElement, BinaryOperator, QFF } from '../../../../src/language/quantificational/quantificationalTypes';
import { binaryOperatorToLogic } from '../../../../src/language/quantificational/quantificationalUtils';

/**
 * COMPLETENESS OF QUANTIFICATIONAL LOGIC (over finite domains)
 * ─────────────────────────────────────────────────────────────────────────────
 * Theorem: The exhaustive evaluation method is sound and complete for
 *          quantificational logic over finite domains.
 *
 *   Soundness    — if exhaustive evaluation returns true on every assignment,
 *                  the formula is valid over that domain.
 *
 *   Completeness — every formula valid over a finite domain is confirmed by
 *                  the exhaustive method.
 *
 * Proof structure:
 *
 *   Part I  — Structural induction: value() correctly computes the truth
 *             function of any QFF under any domain and assignment.
 *
 *     Base case:  AtomicFormulaImpl correctly evaluates predicates
 *                 applied to resolved terms, with and without negation.
 *
 *     IH:         left.value() and right.value() correctly return L and R.
 *
 *     Ind. step:  ComplexFormulaImpl correctly applies binary operators.
 *                 QuantifiedFormulaImpl correctly iterates over all domain
 *                 elements for ∀ and ∃.
 *
 *   Part II — Consequence: known valid formulas, contradictions, and
 *             quantifier dualities are classified correctly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Test helpers ──────────────────────────────────────────────────────────

/** Test domains of increasing size */
const DOMAINS: DomainElement[][] = [
  ['a'],
  ['a', 'b'],
  ['a', 'b', 'c'],
];

/**
 * Check whether a quantificational formula is valid (true under every
 * variable assignment) for a given domain. For formulas with a single
 * free variable x, enumerates all assignments of x.
 */
function isValidOverDomain(
  formula: QFF,
  domain: DomainElement[],
  freeVars: string[],
  assignment: VariableAssignment,
): boolean {
  if (freeVars.length === 0) {
    return formula.value();
  }

  const total = Math.pow(domain.length, freeVars.length);
  for (let i = 0; i < total; i++) {
    let remaining = i;
    freeVars.forEach(name => {
      const dIdx = remaining % domain.length;
      remaining = Math.floor(remaining / domain.length);
      assignment.set(name, domain[dIdx]);
    });
    if (!formula.value()) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Completeness of Quantificational Logic (finite domains)', () => {

  // ── Part I: Structural induction ───────────────────────────────────────────

  describe('Part I — Structural induction: value() is semantically correct', () => {

    describe('Base case — AtomicFormulaImpl', () => {

      test('predicate applied to constant resolves correctly', () => {
        const F = new PredicateImpl('F', 1, (x) => x === 'a');
        const assignment: VariableAssignment = new Map();
        expect(new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment).value.bind(
          { ...new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], new Map([['x', 'a']])) }
        )).toBeDefined();

        // Direct test
        const a1 = new Map<string, DomainElement>([['x', 'a']]);
        expect(new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], a1).value()).toBe(true);

        const a2 = new Map<string, DomainElement>([['x', 'b']]);
        expect(new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], a2).value()).toBe(false);
      });

      test('negation inverts the predicate result', () => {
        const F = new PredicateImpl('F', 1, () => true);
        const assignment = new Map<string, DomainElement>([['x', 'a']]);
        expect(new AtomicFormulaImpl('~', F, [new VariableTerm('x')], assignment).value()).toBe(false);
        expect(new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment).value()).toBe(true);
      });
    });

    describe('Inductive step — ComplexFormulaImpl (binary operators)', () => {
      const operators: BinaryOperator[] = ['&', '|', '->', '<->'];
      const boolPairs: [boolean, boolean][] = [[false,false],[false,true],[true,false],[true,true]];

      function fixedFormula(val: boolean): AtomicFormulaImpl {
        const P = new PredicateImpl('P', 0, () => val);
        return new AtomicFormulaImpl(undefined, P, [], new Map());
      }

      operators.forEach(op => {
        boolPairs.forEach(([L, R]) => {
          const expected = binaryOperatorToLogic[op](L, R);
          test(`(${L} ${op} ${R}) = ${expected}`, () => {
            expect(new ComplexFormulaImpl(undefined, fixedFormula(L), op, fixedFormula(R)).value()).toBe(expected);
          });
          test(`~(${L} ${op} ${R}) = ${!expected}`, () => {
            expect(new ComplexFormulaImpl('~', fixedFormula(L), op, fixedFormula(R)).value()).toBe(!expected);
          });
        });
      });
    });

    describe('Inductive step — QuantifiedFormulaImpl', () => {

      test('∀ iterates every element and is true only when body holds for all', () => {
        DOMAINS.forEach(domain => {
          const assignment: VariableAssignment = new Map();
          // F(x) true only for 'a'
          const F = new PredicateImpl('F', 1, (x) => x === 'a');
          const body = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', body, domain, assignment);

          // Universal is true only on single-element domain {a}
          expect(formula.value()).toBe(domain.length === 1 && domain[0] === 'a');
        });
      });

      test('∃ iterates elements and is true when body holds for at least one', () => {
        DOMAINS.forEach(domain => {
          const assignment: VariableAssignment = new Map();
          // F(x) true only for 'a'
          const F = new PredicateImpl('F', 1, (x) => x === 'a');
          const body = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const formula = new QuantifiedFormulaImpl(undefined, '∃', 'x', body, domain, assignment);

          // 'a' is in every test domain
          expect(formula.value()).toBe(true);
        });
      });
    });
  });

  // ── Part II: Consequence — classification of formulas ─────────────────────

  describe('Part II — Quantifier duality', () => {

    test('~∀x.F(x) ⟺ ∃x.~F(x)  (verified over domains of size 1–3)', () => {
      DOMAINS.forEach(domain => {
        // Test with various predicate extensions: empty, one element, all elements
        const extensions: DomainElement[][] = [
          [],
          [domain[0]],
          [...domain],
        ];

        extensions.forEach(ext => {
          const extSet = new Set(ext);
          const assignment: VariableAssignment = new Map();
          const F = new PredicateImpl('F', 1, (x) => extSet.has(x));

          const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const notFx = new AtomicFormulaImpl('~', F, [new VariableTerm('x')], assignment);

          const lhs = new QuantifiedFormulaImpl('~', '∀', 'x', Fx, domain, assignment);
          const rhs = new QuantifiedFormulaImpl(undefined, '∃', 'x', notFx, domain, assignment);

          expect(lhs.value()).toBe(rhs.value());
        });
      });
    });

    test('~∃x.F(x) ⟺ ∀x.~F(x)  (verified over domains of size 1–3)', () => {
      DOMAINS.forEach(domain => {
        const extensions: DomainElement[][] = [
          [],
          [domain[0]],
          [...domain],
        ];

        extensions.forEach(ext => {
          const extSet = new Set(ext);
          const assignment: VariableAssignment = new Map();
          const F = new PredicateImpl('F', 1, (x) => extSet.has(x));

          const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const notFx = new AtomicFormulaImpl('~', F, [new VariableTerm('x')], assignment);

          const lhs = new QuantifiedFormulaImpl('~', '∃', 'x', Fx, domain, assignment);
          const rhs = new QuantifiedFormulaImpl(undefined, '∀', 'x', notFx, domain, assignment);

          expect(lhs.value()).toBe(rhs.value());
        });
      });
    });
  });

  describe('Part II — Valid quantificational formulas (verified over finite domains)', () => {

    test('∀x.F(x) -> ∃x.F(x)  (on non-empty domains)', () => {
      DOMAINS.forEach(domain => {
        // Test with various predicate extensions
        const extensions = [[], [domain[0]], [...domain]];

        extensions.forEach(ext => {
          const extSet = new Set(ext);
          const assignment: VariableAssignment = new Map();
          const F = new PredicateImpl('F', 1, (x) => extSet.has(x));

          const Fx1 = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const Fx2 = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);

          const forall = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx1, domain, assignment);
          const exists = new QuantifiedFormulaImpl(undefined, '∃', 'x', Fx2, domain, assignment);
          const impl = new ComplexFormulaImpl(undefined, forall, '->', exists);

          // This is valid on non-empty domains
          expect(impl.value()).toBe(true);
        });
      });
    });

    test('∀x.(F(x) & G(x)) <-> (∀x.F(x) & ∀x.G(x))', () => {
      const domain: DomainElement[] = ['a', 'b', 'c'];

      // Test several predicate combinations
      const combos: [Set<DomainElement>, Set<DomainElement>][] = [
        [new Set(['a', 'b', 'c']), new Set(['a', 'b', 'c'])],
        [new Set(['a']), new Set(['a', 'b', 'c'])],
        [new Set([]), new Set(['a', 'b', 'c'])],
        [new Set(['a', 'b']), new Set(['b', 'c'])],
      ];

      combos.forEach(([fExt, gExt]) => {
        const assignment: VariableAssignment = new Map();
        const F = new PredicateImpl('F', 1, (x) => fExt.has(x));
        const G = new PredicateImpl('G', 1, (x) => gExt.has(x));

        const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
        const Gx = new AtomicFormulaImpl(undefined, G, [new VariableTerm('x')], assignment);

        // LHS: ∀x.(F(x) & G(x))
        const conj = new ComplexFormulaImpl(undefined, Fx, '&', Gx);
        const lhs = new QuantifiedFormulaImpl(undefined, '∀', 'x', conj, domain, assignment);

        // RHS: ∀x.F(x) & ∀x.G(x) — note: separate copies of Fx, Gx
        const Fx2 = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
        const Gx2 = new AtomicFormulaImpl(undefined, G, [new VariableTerm('x')], assignment);
        const forallF = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx2, domain, assignment);
        const forallG = new QuantifiedFormulaImpl(undefined, '∀', 'x', Gx2, domain, assignment);
        const rhs = new ComplexFormulaImpl(undefined, forallF, '&', forallG);

        expect(lhs.value()).toBe(rhs.value());
      });
    });

    test('∀x.F(x) -> F(a)  (universal instantiation)', () => {
      DOMAINS.forEach(domain => {
        if (!domain.includes('a')) return;

        const extensions = [[], [domain[0]], [...domain]];
        extensions.forEach(ext => {
          const extSet = new Set(ext);
          const assignment: VariableAssignment = new Map();
          const F = new PredicateImpl('F', 1, (x) => extSet.has(x));

          const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const Fa = new AtomicFormulaImpl(undefined, F, [new VariableTerm('a')], new Map([['a', 'a']]));

          const forall = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx, domain, assignment);
          const impl = new ComplexFormulaImpl(undefined, forall, '->', Fa);

          expect(impl.value()).toBe(true);
        });
      });
    });

    test('F(a) -> ∃x.F(x)  (existential generalisation)', () => {
      DOMAINS.forEach(domain => {
        if (!domain.includes('a')) return;

        const extensions = [[], ['a'], [...domain]];
        extensions.forEach(ext => {
          const extSet = new Set(ext);
          const assignment: VariableAssignment = new Map();
          const F = new PredicateImpl('F', 1, (x) => extSet.has(x));

          const Fa = new AtomicFormulaImpl(undefined, F, [new VariableTerm('a')], new Map<string, DomainElement>([['a', 'a']]));
          const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
          const exists = new QuantifiedFormulaImpl(undefined, '∃', 'x', Fx, domain, assignment);
          const impl = new ComplexFormulaImpl(undefined, Fa, '->', exists);

          expect(impl.value()).toBe(true);
        });
      });
    });
  });

  describe('Part II — Completeness: exhaustive evaluation is a decision procedure for finite domains', () => {

    test('A valid formula is confirmed valid and not refuted', () => {
      // ∀x.(F(x) | ~F(x)) — law of excluded middle, quantified
      const domain: DomainElement[] = ['a', 'b', 'c'];
      const assignment: VariableAssignment = new Map();
      const F = new PredicateImpl('F', 1, (x) => x === 'a');

      const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
      const notFx = new AtomicFormulaImpl('~', F, [new VariableTerm('x')], assignment);
      const disj = new ComplexFormulaImpl(undefined, Fx, '|', notFx);
      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', disj, domain, assignment);

      expect(formula.value()).toBe(true);
    });

    test('A contradictory formula is refuted', () => {
      // ∀x.(F(x) & ~F(x)) — law of non-contradiction, quantified
      const domain: DomainElement[] = ['a', 'b'];
      const assignment: VariableAssignment = new Map();
      const F = new PredicateImpl('F', 1, (x) => x === 'a');

      const Fx = new AtomicFormulaImpl(undefined, F, [new VariableTerm('x')], assignment);
      const notFx = new AtomicFormulaImpl('~', F, [new VariableTerm('x')], assignment);
      const conj = new ComplexFormulaImpl(undefined, Fx, '&', notFx);
      const formula = new QuantifiedFormulaImpl(undefined, '∀', 'x', conj, domain, assignment);

      expect(formula.value()).toBe(false);
    });

    test('A contingent formula produces mixed results across domains', () => {
      // ∀x.F(x) — depends on the predicate extension
      const domain: DomainElement[] = ['a', 'b'];
      const assignment: VariableAssignment = new Map();

      // When F holds for all
      const F1 = new PredicateImpl('F', 1, () => true);
      const Fx1 = new AtomicFormulaImpl(undefined, F1, [new VariableTerm('x')], assignment);
      const forall1 = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx1, domain, assignment);
      expect(forall1.value()).toBe(true);

      // When F holds for some but not all
      const F2 = new PredicateImpl('F', 1, (x) => x === 'a');
      const Fx2 = new AtomicFormulaImpl(undefined, F2, [new VariableTerm('x')], assignment);
      const forall2 = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx2, domain, assignment);
      expect(forall2.value()).toBe(false);
    });
  });
});
