import { AtomImpl } from '../../../../src/language/propositional/atom';
import { ComplexImpl } from '../../../../src/language/propositional/complex';
import { WFF } from '../../../../src/language/propositional/propositionalTypes';

/**
 * EXPRESSIVE ADEQUACY OF PROPOSITIONAL LOGIC
 * ─────────────────────────────────────────────────────────────────────────────
 * Theorem: The connective set {~, &, |} is expressively adequate — every
 *          n-ary boolean truth function f: {T,F}^n → {T,F} is expressible
 *          as a WFF using only negation, conjunction, and disjunction.
 *
 * Corollary: Since (->) and (<->) are both definable in {~, &, |}, the full
 *            connective set {~, &, |, ->, <->} is no more expressive than
 *            {~, &, |} alone.
 *
 * Proof structure (induction on arity n):
 *
 *   Base case  (n = 1): all four unary truth functions are expressible.
 *
 *   Inductive step: given that all functions of arity k are expressible,
 *     any (k+1)-ary function f is expressible via the Shannon expansion:
 *
 *       φ_f(x, y₁…yₖ) ≡ (x & φ_{f[x=T]}(y₁…yₖ))
 *                      | (~x & φ_{f[x=F]}(y₁…yₖ))
 *
 *     where φ_{f[x=T]} and φ_{f[x=F]} have arity k and are expressible by IH.
 *
 *   Exhaustive check: all 16 binary truth functions are individually verified
 *     via explicit DNF construction (a direct application of the above).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Truth table for a binary function: [f(F,F), f(F,T), f(T,F), f(T,T)]
type BinaryTruthTable = [boolean, boolean, boolean, boolean];

const UNARY_VALUATIONS: boolean[] = [false, true];

const BINARY_VALUATIONS: [boolean, boolean][] = [
  [false, false],
  [false, true],
  [true,  false],
  [true,  true],
];

/**
 * Build a WFF in Disjunctive Normal Form (DNF) for the given binary truth
 * table using only {~, &, |}. Each minterm is a conjunction of literals
 * (p or ~p) & (q or ~q) for the row where f = T; the DNF is their disjunction.
 *
 * The always-false function (no true rows) is encoded as p & ~p.
 */
function buildDNF(
  p: WFF, notP: WFF,
  q: WFF, notQ: WFF,
  table: BinaryTruthTable,
): WFF {
  // Literal pairs for each valuation row: [p=F,q=F], [p=F,q=T], [p=T,q=F], [p=T,q=T]
  const literalPairs: [WFF, WFF][] = [
    [notP, notQ],
    [notP, q],
    [p,    notQ],
    [p,    q],
  ];

  const minterms: WFF[] = table
    .map((isTrue, i) =>
      isTrue
        ? (new ComplexImpl(undefined, literalPairs[i][0], '&', literalPairs[i][1]) as WFF)
        : null,
    )
    .filter((m): m is WFF => m !== null);

  if (minterms.length === 0) {
    return new ComplexImpl(undefined, p, '&', notP) as WFF; // ⊥ (always false)
  }

  return minterms.reduce(
    (acc, minterm) => new ComplexImpl(undefined, acc, '|', minterm) as WFF,
  );
}

// All 16 binary truth tables, enumerated by treating the table's 4 bits as
// the binary representation of an integer 0–15.
const ALL_BINARY_TABLES: BinaryTruthTable[] = Array.from({ length: 16 }, (_, i) => [
  Boolean(i & 1),
  Boolean(i & 2),
  Boolean(i & 4),
  Boolean(i & 8),
] as BinaryTruthTable);

// ─────────────────────────────────────────────────────────────────────────────

describe('Expressive Adequacy of Propositional Logic', () => {

  // ── Corollary: inter-definability of connectives ────────────────────────────

  describe('Corollary — inter-definability: {->, <->} are definable in {~, &, |}', () => {
    let pVal = false;
    let qVal = false;
    const p    = new AtomImpl(undefined, () => pVal);
    const notP = new AtomImpl('~',       () => pVal);
    const q    = new AtomImpl(undefined, () => qVal);

    test('(->) is definable in {~, |}: p -> q  ≡  ~p | q', () => {
      const impl = new ComplexImpl(undefined, p, '->', q);
      const defn = new ComplexImpl(undefined, notP, '|', q);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(impl.value()).toBe(defn.value());
      }
    });

    test('(<->) is definable in {~, &, |}: p <-> q  ≡  (p & q) | (~p & ~q)', () => {
      const notQ   = new AtomImpl('~', () => qVal);
      const bicond = new ComplexImpl(undefined, p, '<->', q);
      const defn   = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p,    '&', q),
        '|',
        new ComplexImpl(undefined, notP, '&', notQ),
      );
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(bicond.value()).toBe(defn.value());
      }
    });

    test("De Morgan (1): ~(p & q)  ≡  ~p | ~q", () => {
      const notQ   = new AtomImpl('~', () => qVal);
      const nand   = new AtomImpl('~', () => new ComplexImpl(undefined, p, '&', q).value());
      const deMorg = new ComplexImpl(undefined, notP, '|', notQ);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(nand.value()).toBe(deMorg.value());
      }
    });

    test("De Morgan (2): ~(p | q)  ≡  ~p & ~q", () => {
      const notQ   = new AtomImpl('~', () => qVal);
      const nor    = new AtomImpl('~', () => new ComplexImpl(undefined, p, '|', q).value());
      const deMorg = new ComplexImpl(undefined, notP, '&', notQ);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(nor.value()).toBe(deMorg.value());
      }
    });
  });

  // ── Base case (n = 1) ────────────────────────────────────────────────────────

  describe('Base case (n = 1) — all four unary truth functions are expressible', () => {
    let pVal = false;
    const p    = new AtomImpl(undefined, () => pVal);
    const notP = new AtomImpl('~',       () => pVal);

    /**
     * There are exactly 2^(2^1) = 4 unary truth functions.
     * We exhibit a WFF in {~, &, |} for each.
     */

    test('f(p) = ⊤  (always true)   expressed by  p | ~p', () => {
      const verum = new ComplexImpl(undefined, p, '|', notP);
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(verum.value()).toBe(true);
      }
    });

    test('f(p) = ⊥  (always false)  expressed by  p & ~p', () => {
      const falsum = new ComplexImpl(undefined, p, '&', notP);
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(falsum.value()).toBe(false);
      }
    });

    test('f(p) = p   (identity)     expressed by  p', () => {
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(p.value()).toBe(pv);
      }
    });

    test('f(p) = ~p  (negation)     expressed by  ~p', () => {
      for (const pv of UNARY_VALUATIONS) {
        pVal = pv;
        expect(notP.value()).toBe(!pv);
      }
    });
  });

  // ── Inductive step ───────────────────────────────────────────────────────────

  describe('Inductive step — Shannon expansion preserves expressibility', () => {
    /**
     * Shannon expansion theorem (also called the Boole expansion or Shannon
     * decomposition):
     *
     *   φ_f(x, y) ≡ (x & φ_{f[x=T]}(y)) | (~x & φ_{f[x=F]}(y))
     *
     * IH: the unary functions f[x=T] and f[x=F] are each expressible (base case).
     * Ind. step: the combined binary function is expressible using {&, |, ~} plus
     *   the IH witnesses.
     *
     * We demonstrate with AND, OR, and material implication — connectives whose
     * unary slices are among the four base-case functions.
     */

    let pVal = false;
    let qVal = false;
    const p    = new AtomImpl(undefined, () => pVal);
    const notP = new AtomImpl('~',       () => pVal);
    const q    = new AtomImpl(undefined, () => qVal);
    const notQ = new AtomImpl('~',       () => qVal);
    const verum  = new ComplexImpl(undefined, q, '|', notQ); // always true  (IH base)
    const falsum = new ComplexImpl(undefined, q, '&', notQ); // always false (IH base)

    test('Shannon expansion reconstructs AND: f(p,q) = p & q', () => {
      // f[p=T](q) = q      (IH: identity)
      // f[p=F](q) = ⊥      (IH: always false)
      const shannon = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p,    '&', q),
        '|',
        new ComplexImpl(undefined, notP, '&', falsum),
      );
      const original = new ComplexImpl(undefined, p, '&', q);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(shannon.value()).toBe(original.value());
      }
    });

    test('Shannon expansion reconstructs OR: f(p,q) = p | q', () => {
      // f[p=T](q) = ⊤      (IH: always true)
      // f[p=F](q) = q      (IH: identity)
      const shannon = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p,    '&', verum),
        '|',
        new ComplexImpl(undefined, notP, '&', q),
      );
      const original = new ComplexImpl(undefined, p, '|', q);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(shannon.value()).toBe(original.value());
      }
    });

    test('Shannon expansion reconstructs IMPLICATION: f(p,q) = p -> q', () => {
      // f[p=T](q) = q      (IH: identity)
      // f[p=F](q) = ⊤      (IH: always true)
      const shannon = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p,    '&', q),
        '|',
        new ComplexImpl(undefined, notP, '&', verum),
      );
      const original = new ComplexImpl(undefined, p, '->', q);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(shannon.value()).toBe(original.value());
      }
    });

    test('Shannon expansion reconstructs BICONDITIONAL: f(p,q) = p <-> q', () => {
      // f[p=T](q) = q      (IH: identity)
      // f[p=F](q) = ~q     (IH: negation)
      const shannon = new ComplexImpl(
        undefined,
        new ComplexImpl(undefined, p,    '&', q),
        '|',
        new ComplexImpl(undefined, notP, '&', notQ),
      );
      const original = new ComplexImpl(undefined, p, '<->', q);
      for (const [pv, qv] of BINARY_VALUATIONS) {
        pVal = pv; qVal = qv;
        expect(shannon.value()).toBe(original.value());
      }
    });
  });

  // ── Exhaustive check ─────────────────────────────────────────────────────────

  describe('Exhaustive — all 16 binary truth functions are expressible via DNF in {~, &, |}', () => {
    /**
     * Consequence of the inductive proof: for any binary truth table, the DNF
     * construction (sum of minterms) produces a correct {~, &, |} formula.
     * We verify this for every one of the 2^(2^2) = 16 possible binary functions.
     */
    let pVal = false;
    let qVal = false;
    const p    = new AtomImpl(undefined, () => pVal);
    const notP = new AtomImpl('~',       () => pVal);
    const q    = new AtomImpl(undefined, () => qVal);
    const notQ = new AtomImpl('~',       () => qVal);

    ALL_BINARY_TABLES.forEach((table, index) => {
      test(`truth function #${index}  table: [F,F]=${table[0]} [F,T]=${table[1]} [T,F]=${table[2]} [T,T]=${table[3]}`, () => {
        const dnf = buildDNF(p, notP, q, notQ, table);
        BINARY_VALUATIONS.forEach(([pv, qv], i) => {
          pVal = pv; qVal = qv;
          expect(dnf.value()).toBe(table[i]);
        });
      });
    });
  });
});
