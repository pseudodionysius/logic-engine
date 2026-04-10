import { PropositionalSyntaxEngine } from '../../../../src/engine/syntax/propositional/syntaxEngine';

describe('PropositionalSyntaxEngine', () => {
  let engine: PropositionalSyntaxEngine;

  beforeEach(() => { engine = new PropositionalSyntaxEngine(); });

  // ── parse() — atoms ────────────────────────────────────────────────────────

  describe('parse() — atoms', () => {
    test('parses a single proposition letter', () => {
      const { formula, variables } = engine.parse('p');
      variables.get('p')!.assign(true);
      expect(formula.value()).toBe(true);
      variables.get('p')!.assign(false);
      expect(formula.value()).toBe(false);
    });

    test('parses a proposition letter with a digit suffix', () => {
      const { formula, variables } = engine.parse('p1');
      variables.get('p1')!.assign(true);
      expect(formula.value()).toBe(true);
    });

    test('variable registry contains exactly the letters used', () => {
      const { variables } = engine.parse('p');
      expect(variables.has('p')).toBe(true);
      expect(variables.size).toBe(1);
    });
  });

  // ── parse() — negation ─────────────────────────────────────────────────────

  describe('parse() — negation', () => {
    test('~p is false when p is true', () => {
      const { formula, variables } = engine.parse('~p');
      variables.get('p')!.assign(true);
      expect(formula.value()).toBe(false);
    });

    test('~p is true when p is false', () => {
      const { formula, variables } = engine.parse('~p');
      variables.get('p')!.assign(false);
      expect(formula.value()).toBe(true);
    });

    test('double negation ~~p reduces to p', () => {
      const { formula, variables } = engine.parse('~~p');
      variables.get('p')!.assign(true);
      expect(formula.value()).toBe(true);
      variables.get('p')!.assign(false);
      expect(formula.value()).toBe(false);
    });

    test('triple negation ~~~p behaves as ~p', () => {
      const { formula, variables } = engine.parse('~~~p');
      variables.get('p')!.assign(true);
      expect(formula.value()).toBe(false);
      variables.get('p')!.assign(false);
      expect(formula.value()).toBe(true);
    });
  });

  // ── parse() — conjunction ──────────────────────────────────────────────────

  describe('parse() — conjunction (&)', () => {
    test.each([
      [true,  true,  true ],
      [true,  false, false],
      [false, true,  false],
      [false, false, false],
    ])('p=%s & q=%s → %s', (p, q, expected) => {
      const { formula, variables } = engine.parse('p & q');
      variables.get('p')!.assign(p);
      variables.get('q')!.assign(q);
      expect(formula.value()).toBe(expected);
    });
  });

  // ── parse() — disjunction ──────────────────────────────────────────────────

  describe('parse() — disjunction (|)', () => {
    test.each([
      [true,  true,  true ],
      [true,  false, true ],
      [false, true,  true ],
      [false, false, false],
    ])('p=%s | q=%s → %s', (p, q, expected) => {
      const { formula, variables } = engine.parse('p | q');
      variables.get('p')!.assign(p);
      variables.get('q')!.assign(q);
      expect(formula.value()).toBe(expected);
    });
  });

  // ── parse() — implication ──────────────────────────────────────────────────

  describe('parse() — implication (->)', () => {
    test.each([
      [true,  true,  true ],
      [true,  false, false],
      [false, true,  true ],
      [false, false, true ],
    ])('p=%s -> q=%s → %s', (p, q, expected) => {
      const { formula, variables } = engine.parse('p -> q');
      variables.get('p')!.assign(p);
      variables.get('q')!.assign(q);
      expect(formula.value()).toBe(expected);
    });
  });

  // ── parse() — biconditional ────────────────────────────────────────────────

  describe('parse() — biconditional (<->)', () => {
    test.each([
      [true,  true,  true ],
      [true,  false, false],
      [false, true,  false],
      [false, false, true ],
    ])('p=%s <-> q=%s → %s', (p, q, expected) => {
      const { formula, variables } = engine.parse('p <-> q');
      variables.get('p')!.assign(p);
      variables.get('q')!.assign(q);
      expect(formula.value()).toBe(expected);
    });
  });

  // ── parse() — precedence ───────────────────────────────────────────────────

  describe('parse() — operator precedence', () => {
    test('~ binds tighter than &: ~p & q ≡ (~p) & q', () => {
      const { formula, variables } = engine.parse('~p & q');
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(true);
      expect(formula.value()).toBe(false); // ~T & T = F & T = F
    });

    test('& binds tighter than |: p & q | r ≡ (p & q) | r', () => {
      const { formula, variables } = engine.parse('p & q | r');
      variables.get('p')!.assign(false);
      variables.get('q')!.assign(false);
      variables.get('r')!.assign(true);
      expect(formula.value()).toBe(true); // (F & F) | T = F | T = T
    });

    test('| binds tighter than ->: p | q -> r ≡ (p | q) -> r', () => {
      const { formula, variables } = engine.parse('p | q -> r');
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(false);
      variables.get('r')!.assign(false);
      expect(formula.value()).toBe(false); // (T | F) -> F = T -> F = F
    });

    test('-> is right-associative: p -> q -> r ≡ p -> (q -> r)', () => {
      const { formula, variables } = engine.parse('p -> q -> r');
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(true);
      variables.get('r')!.assign(false);
      // p -> (q -> r) = T -> (T -> F) = T -> F = F
      expect(formula.value()).toBe(false);
    });

    test('<-> has lowest precedence: p & q <-> q | r', () => {
      const { formula, variables } = engine.parse('p & q <-> q | r');
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(true);
      variables.get('r')!.assign(false);
      // (T & T) <-> (T | F) = T <-> T = T
      expect(formula.value()).toBe(true);
    });
  });

  // ── parse() — parentheses ──────────────────────────────────────────────────

  describe('parse() — parentheses', () => {
    test('(p | q) -> r — parentheses override default precedence', () => {
      const { formula, variables } = engine.parse('(p | q) -> r');
      variables.get('p')!.assign(false);
      variables.get('q')!.assign(false);
      variables.get('r')!.assign(false);
      expect(formula.value()).toBe(true); // (F | F) -> F = F -> F = T
    });

    test('~(p & q) — negation of a parenthesised group', () => {
      const { formula, variables } = engine.parse('~(p & q)');
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(true);
      expect(formula.value()).toBe(false); // ~(T & T) = ~T = F
      variables.get('p')!.assign(true);
      variables.get('q')!.assign(false);
      expect(formula.value()).toBe(true);  // ~(T & F) = ~F = T
    });

    test('nested parentheses', () => {
      const { formula, variables } = engine.parse('((p -> q) & (q -> r)) -> (p -> r)');
      // This is a tautology (hypothetical syllogism)
      const v = variables;
      let allTrue = true;
      for (const pv of [true, false]) {
        for (const qv of [true, false]) {
          for (const rv of [true, false]) {
            v.get('p')!.assign(pv);
            v.get('q')!.assign(qv);
            v.get('r')!.assign(rv);
            if (!formula.value()) { allTrue = false; }
          }
        }
      }
      expect(allTrue).toBe(true);
    });
  });

  // ── parse() — variable sharing ─────────────────────────────────────────────

  describe('parse() — variable sharing', () => {
    test('same letter in the same formula shares one variable', () => {
      const { formula, variables } = engine.parse('p -> p');
      // This is a tautology
      variables.get('p')!.assign(true);
      expect(formula.value()).toBe(true);
      variables.get('p')!.assign(false);
      expect(formula.value()).toBe(true);
    });

    test('two letters produce two independent variables', () => {
      const { variables } = engine.parse('p & q');
      expect(variables.size).toBe(2);
      expect(variables.has('p')).toBe(true);
      expect(variables.has('q')).toBe(true);
    });
  });

  // ── parseInto() ────────────────────────────────────────────────────────────

  describe('parseInto()', () => {
    test('reuses existing variables from the registry', () => {
      const shared = new Map();
      const f1 = engine.parseInto('p & q', shared);
      const f2 = engine.parseInto('p | r', shared);
      // both f1 and f2 reference the same PropositionalVariable for 'p'
      expect(shared.size).toBe(3); // p, q, r
      shared.get('p')!.assign(true);
      shared.get('q')!.assign(false);
      shared.get('r')!.assign(false);
      expect(f1.value()).toBe(false); // T & F = F
      expect(f2.value()).toBe(true);  // T | F = T
    });

    test('changing shared variable updates both formulas', () => {
      const shared = new Map();
      const f1 = engine.parseInto('p', shared);
      const f2 = engine.parseInto('~p', shared);
      shared.get('p')!.assign(true);
      expect(f1.value()).toBe(true);
      expect(f2.value()).toBe(false);
      shared.get('p')!.assign(false);
      expect(f1.value()).toBe(false);
      expect(f2.value()).toBe(true);
    });
  });

  // ── parse() — known tautologies ───────────────────────────────────────────

  describe('parse() — known tautologies', () => {
    function isTautology(formulaString: string): boolean {
      const { formula, variables } = engine.parse(formulaString);
      const varNames = Array.from(variables.keys());
      const n = varNames.length;
      for (let mask = 0; mask < Math.pow(2, n); mask++) {
        varNames.forEach((name, i) => variables.get(name)!.assign(Boolean((mask >> i) & 1)));
        if (!formula.value()) return false;
      }
      return true;
    }

    test('p | ~p (excluded middle)', () => {
      expect(isTautology('p | ~p')).toBe(true);
    });

    test('p -> p (reflexivity)', () => {
      expect(isTautology('p -> p')).toBe(true);
    });

    test('~(p & ~p) (non-contradiction)', () => {
      expect(isTautology('~(p & ~p)')).toBe(true);
    });

    test('(p -> q) -> (~q -> ~p) (contraposition)', () => {
      expect(isTautology('(p -> q) -> (~q -> ~p)')).toBe(true);
    });

    test('((p -> q) & (q -> r)) -> (p -> r) (hypothetical syllogism)', () => {
      expect(isTautology('((p -> q) & (q -> r)) -> (p -> r)')).toBe(true);
    });

    test('(p & q) -> p (simplification)', () => {
      expect(isTautology('(p & q) -> p')).toBe(true);
    });

    test('p -> (p | q) (addition)', () => {
      expect(isTautology('p -> (p | q)')).toBe(true);
    });
  });

  // ── parse() — error cases ──────────────────────────────────────────────────

  describe('parse() — error cases', () => {
    test('throws SyntaxError for empty string', () => {
      expect(() => engine.parse('')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for unmatched opening parenthesis', () => {
      expect(() => engine.parse('(p & q')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for unmatched closing parenthesis', () => {
      expect(() => engine.parse('p & q)')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for dangling operator', () => {
      expect(() => engine.parse('p &')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for invalid character', () => {
      expect(() => engine.parse('p @ q')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for uppercase proposition letter', () => {
      expect(() => engine.parse('P')).toThrow(SyntaxError);
    });
  });
});
