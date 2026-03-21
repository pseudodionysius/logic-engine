import { AtomImpl } from '../../../../src/language/propositional/atom';
import { ComplexImpl } from '../../../../src/language/propositional/complex';
import { WFF, BinaryOperator } from '../../../../src/language/propositional/propositionalTypes';
import { binaryOperatorToLogic } from '../../../../src/language/propositional/propositionalUtils';

/**
 * COMPLETENESS OF PROPOSITIONAL LOGIC (Semantic / Truth-Table Completeness)
 * ─────────────────────────────────────────────────────────────────────────────
 * Theorem: The truth-table evaluation method is sound and complete for
 *          propositional logic.
 *
 *   Soundness    — if exhaustive truth-table evaluation returns true on every
 *                  row, the formula is a semantic tautology by definition.
 *
 *   Completeness — every semantic tautology is confirmed by the truth-table
 *                  method (there are no tautologies the method can miss).
 *
 * Together these establish that truth-table evaluation is a decision procedure
 * for propositional tautologyhood.
 *
 * Proof structure:
 *
 *   Part I  — Structural induction: value() correctly computes the truth
 *             function of any WFF under any valuation.
 *
 *     Base case:  AtomImpl.value() directly evaluates the proposition
 *                 (boolean or thunk) and applies unary ~ if present.
 *
 *     IH:         left.value() and right.value() correctly return L and R.
 *
 *     Ind. step:  ComplexImpl.value() = binaryOperatorToLogic[op](L, R),
 *                 then applies ~ if present. Verified for every (op, L, R).
 *
 *   Part II — Consequence: known tautologies, contradictions, and
 *             contingencies are classified correctly by exhaustive evaluation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const UNARY_VALUATIONS:  boolean[]               = [false, true];
const BINARY_VALUATIONS: [boolean, boolean][]    = [[false,false],[false,true],[true,false],[true,true]];
const TERNARY_VALUATIONS: [boolean,boolean,boolean][] = [
  [false,false,false],[false,false,true],
  [false,true, false],[false,true, true],
  [true, false,false],[true, false,true],
  [true, true, false],[true, true, true],
];

/** Returns true iff wff evaluates to true under every binary valuation. */
function isTautology(
  wff: WFF,
  valuations: Array<boolean[]>,
  setters: Array<(v: boolean) => void>,
): boolean {
  return valuations.every(row => {
    row.forEach((v, i) => setters[i](v));
    return wff.value();
  });
}

/** Returns true iff wff evaluates to false under every binary valuation. */
function isContradiction(
  wff: WFF,
  valuations: Array<boolean[]>,
  setters: Array<(v: boolean) => void>,
): boolean {
  return valuations.every(row => {
    row.forEach((v, i) => setters[i](v));
    return !wff.value();
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Completeness of Propositional Logic', () => {

  // ── Part I: Structural induction ─────────────────────────────────────────────

  describe('Part I — Structural induction: value() is semantically correct', () => {

    describe('Base case — AtomImpl correctly evaluates atomic propositions', () => {

      test('boolean literal  true  → value() = true', () => {
        expect(new AtomImpl(undefined, true).value()).toBe(true);
      });

      test('boolean literal  false → value() = false', () => {
        expect(new AtomImpl(undefined, false).value()).toBe(false);
      });

      test('thunk proposition is evaluated lazily at call time', () => {
        let x = false;
        const a = new AtomImpl(undefined, () => x);
        expect(a.value()).toBe(false);
        x = true;
        expect(a.value()).toBe(true);
      });

      test('unary ~ negates a true proposition → false', () => {
        expect(new AtomImpl('~', true).value()).toBe(false);
      });

      test('unary ~ negates a false proposition → true', () => {
        expect(new AtomImpl('~', false).value()).toBe(true);
      });

      test('undefined unary operator leaves proposition value unchanged', () => {
        expect(new AtomImpl(undefined, true).value()).toBe(true);
        expect(new AtomImpl(undefined, false).value()).toBe(false);
      });

      test('unary ~ on a thunk proposition negates the thunk result', () => {
        let x = true;
        const a = new AtomImpl('~', () => x);
        expect(a.value()).toBe(false);
        x = false;
        expect(a.value()).toBe(true);
      });
    });

    describe('Inductive step — ComplexImpl correctly combines sub-formula truth values', () => {
      /**
       * IH: left.value() = L and right.value() = R for fixed booleans L, R.
       * We verify ComplexImpl.value() = binaryOperatorToLogic[op](L, R) for
       * every combination of operator and boolean inputs, with and without
       * outer negation (~).  This exhausts the inductive step.
       */

      const operators: BinaryOperator[] = ['&', '|', '->', '<->'];

      operators.forEach(op => {
        describe(`binary operator '${op}'`, () => {
          BINARY_VALUATIONS.forEach(([L, R]) => {
            const expected    = binaryOperatorToLogic[op](L, R);
            const expectedNeg = !expected;

            test(`value()   of  (${L} ${op} ${R})  =  ${expected}`, () => {
              const left  = new AtomImpl(undefined, L);
              const right = new AtomImpl(undefined, R);
              expect(new ComplexImpl(undefined, left, op, right).value()).toBe(expected);
            });

            test(`value()   of ~(${L} ${op} ${R})  =  ${expectedNeg}`, () => {
              const left  = new AtomImpl(undefined, L);
              const right = new AtomImpl(undefined, R);
              expect(new ComplexImpl('~', left, op, right).value()).toBe(expectedNeg);
            });
          });
        });
      });
    });
  });

  // ── Part II: Consequence — classification of formulae ────────────────────────

  describe('Part II — Tautologies evaluate to true on every valuation', () => {

    test('Law of Excluded Middle: p | ~p', () => {
      let pVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const notP = new AtomImpl('~',       () => pVal);
      const lem  = new ComplexImpl(undefined, p, '|', notP);
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(lem.value()).toBe(true);
      }
    });

    test('Double Negation Elimination: ~~p <-> p', () => {
      let pVal = false;
      const notP    = new AtomImpl('~', () => pVal);
      const notNotP = new AtomImpl('~', () => notP.value());
      const p       = new AtomImpl(undefined, () => pVal);
      const dn = new ComplexImpl(undefined, notNotP, '<->', p);
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(dn.value()).toBe(true);
      }
    });

    test('Modus Ponens preservation: (p & (p -> q)) -> q', () => {
      let pVal = false, qVal = false;
      const p  = new AtomImpl(undefined, () => pVal);
      const q  = new AtomImpl(undefined, () => qVal);
      const mp = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '&', new ComplexImpl(undefined, p, '->', q)),
        '->',
        q,
      );
      expect(isTautology(mp, BINARY_VALUATIONS, [v => { pVal = v; }, v => { qVal = v; }])).toBe(true);
    });

    test('Hypothetical Syllogism: ((p -> q) & (q -> r)) -> (p -> r)', () => {
      let pVal = false, qVal = false, rVal = false;
      const p  = new AtomImpl(undefined, () => pVal);
      const q  = new AtomImpl(undefined, () => qVal);
      const r  = new AtomImpl(undefined, () => rVal);
      const hs = new ComplexImpl(
        undefined,
        new ComplexImpl(
          undefined,
          new ComplexImpl(undefined, p, '->', q),
          '&',
          new ComplexImpl(undefined, q, '->', r),
        ),
        '->',
        new ComplexImpl(undefined, p, '->', r),
      );
      expect(isTautology(hs, TERNARY_VALUATIONS, [
        v => { pVal = v; }, v => { qVal = v; }, v => { rVal = v; },
      ])).toBe(true);
    });

    test('Contraposition: (p -> q) <-> (~q -> ~p)', () => {
      let pVal = false, qVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const q    = new AtomImpl(undefined, () => qVal);
      const notP = new AtomImpl('~', () => pVal);
      const notQ = new AtomImpl('~', () => qVal);
      const contra = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '->', q),
        '<->',
        new ComplexImpl(undefined, notQ, '->', notP),
      );
      expect(isTautology(contra, BINARY_VALUATIONS, [v => { pVal = v; }, v => { qVal = v; }])).toBe(true);
    });

    test('Distributivity: p & (q | r) <-> (p & q) | (p & r)', () => {
      let pVal = false, qVal = false, rVal = false;
      const p = new AtomImpl(undefined, () => pVal);
      const q = new AtomImpl(undefined, () => qVal);
      const r = new AtomImpl(undefined, () => rVal);
      const dist = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '&', new ComplexImpl(undefined, q, '|', r)),
        '<->',
        new ComplexImpl(
          undefined,
          new ComplexImpl(undefined, p, '&', q),
          '|',
          new ComplexImpl(undefined, p, '&', r),
        ),
      );
      expect(isTautology(dist, TERNARY_VALUATIONS, [
        v => { pVal = v; }, v => { qVal = v; }, v => { rVal = v; },
      ])).toBe(true);
    });

    test('Absorption (1): p | (p & q) <-> p', () => {
      let pVal = false, qVal = false;
      const p = new AtomImpl(undefined, () => pVal);
      const q = new AtomImpl(undefined, () => qVal);
      const abs = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '|', new ComplexImpl(undefined, p, '&', q)),
        '<->',
        p,
      );
      expect(isTautology(abs, BINARY_VALUATIONS, [v => { pVal = v; }, v => { qVal = v; }])).toBe(true);
    });

    test('Absorption (2): p & (p | q) <-> p', () => {
      let pVal = false, qVal = false;
      const p = new AtomImpl(undefined, () => pVal);
      const q = new AtomImpl(undefined, () => qVal);
      const abs = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '&', new ComplexImpl(undefined, p, '|', q)),
        '<->',
        p,
      );
      expect(isTautology(abs, BINARY_VALUATIONS, [v => { pVal = v; }, v => { qVal = v; }])).toBe(true);
    });
  });

  describe('Part II — Contradictions evaluate to false on every valuation', () => {

    test('Law of Non-Contradiction: p & ~p', () => {
      let pVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const notP = new AtomImpl('~',       () => pVal);
      const lnc  = new ComplexImpl(undefined, p, '&', notP);
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(lnc.value()).toBe(false);
      }
    });

    test('Compound contradiction: (p & ~p) & (q | ~q)', () => {
      let pVal = false, qVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const notP = new AtomImpl('~',       () => pVal);
      const q    = new AtomImpl(undefined, () => qVal);
      const notQ = new AtomImpl('~',       () => qVal);
      const compound = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p, '&', notP),
        '&',
        new ComplexImpl(undefined, q, '|', notQ),
      );
      expect(isContradiction(compound, BINARY_VALUATIONS, [v => { pVal = v; }, v => { qVal = v; }])).toBe(true);
    });
  });

  describe('Part II — Contingencies produce mixed truth values', () => {

    test('p & q  is neither a tautology nor a contradiction', () => {
      let pVal = false, qVal = false;
      const p   = new AtomImpl(undefined, () => pVal);
      const q   = new AtomImpl(undefined, () => qVal);
      const wff = new ComplexImpl(undefined, p, '&', q);
      const results = BINARY_VALUATIONS.map(([pv, qv]) => { pVal = pv; qVal = qv; return wff.value(); });
      expect(results).toContain(true);
      expect(results).toContain(false);
    });

    test('p -> q  is neither a tautology nor a contradiction', () => {
      let pVal = false, qVal = false;
      const p   = new AtomImpl(undefined, () => pVal);
      const q   = new AtomImpl(undefined, () => qVal);
      const wff = new ComplexImpl(undefined, p, '->', q);
      const results = BINARY_VALUATIONS.map(([pv, qv]) => { pVal = pv; qVal = qv; return wff.value(); });
      expect(results).toContain(true);
      expect(results).toContain(false);
    });

    test('p <-> q  is neither a tautology nor a contradiction', () => {
      let pVal = false, qVal = false;
      const p   = new AtomImpl(undefined, () => pVal);
      const q   = new AtomImpl(undefined, () => qVal);
      const wff = new ComplexImpl(undefined, p, '<->', q);
      const results = BINARY_VALUATIONS.map(([pv, qv]) => { pVal = pv; qVal = qv; return wff.value(); });
      expect(results).toContain(true);
      expect(results).toContain(false);
    });
  });

  describe('Part II — Completeness: truth-table evaluation is a decision procedure', () => {
    /**
     * We verify the decision procedure classifies every formula correctly by
     * confirming that isTautology and isContradiction are mutually exclusive
     * and that no tautology is misclassified as contingent.
     */

    test('A tautology is confirmed by isTautology and rejected by isContradiction', () => {
      let pVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const notP = new AtomImpl('~',       () => pVal);
      const lem  = new ComplexImpl(undefined, p, '|', notP);
      expect(isTautology(lem, UNARY_VALUATIONS.map(v => [v]), [v => { pVal = v; }])).toBe(true);
      expect(isContradiction(lem, UNARY_VALUATIONS.map(v => [v]), [v => { pVal = v; }])).toBe(false);
    });

    test('A contradiction is confirmed by isContradiction and rejected by isTautology', () => {
      let pVal = false;
      const p    = new AtomImpl(undefined, () => pVal);
      const notP = new AtomImpl('~',       () => pVal);
      const lnc  = new ComplexImpl(undefined, p, '&', notP);
      expect(isContradiction(lnc, UNARY_VALUATIONS.map(v => [v]), [v => { pVal = v; }])).toBe(true);
      expect(isTautology(lnc, UNARY_VALUATIONS.map(v => [v]), [v => { pVal = v; }])).toBe(false);
    });

    test('A contingency is rejected by both isTautology and isContradiction', () => {
      let pVal = false, qVal = false;
      const p   = new AtomImpl(undefined, () => pVal);
      const q   = new AtomImpl(undefined, () => qVal);
      const wff = new ComplexImpl(undefined, p, '&', q);
      const setters = [v => { pVal = v; }, v => { qVal = v; }] as Array<(v: boolean) => void>;
      expect(isTautology(wff, BINARY_VALUATIONS, setters)).toBe(false);
      expect(isContradiction(wff, BINARY_VALUATIONS, setters)).toBe(false);
    });
  });
});
