import { PropositionalEvaluationEngine } from '../../../../src/engine/semantics/propositional/evaluationEngine';
import { PropositionalSyntaxEngine } from '../../../../src/engine/syntax/propositional/syntaxEngine';

describe('PropositionalEvaluationEngine', () => {
  let engine: PropositionalEvaluationEngine;
  let syntax: PropositionalSyntaxEngine;

  beforeEach(() => {
    engine = new PropositionalEvaluationEngine();
    syntax = new PropositionalSyntaxEngine();
  });

  // ── classify() ─────────────────────────────────────────────────────────────

  describe('classify() — tautologies', () => {
    test('p | ~p is a tautology', () => {
      expect(engine.classify('p | ~p')).toBe('tautology');
    });

    test('p -> p is a tautology', () => {
      expect(engine.classify('p -> p')).toBe('tautology');
    });

    test('~(p & ~p) is a tautology', () => {
      expect(engine.classify('~(p & ~p)')).toBe('tautology');
    });

    test('(p -> q) -> (~q -> ~p) is a tautology (contraposition)', () => {
      expect(engine.classify('(p -> q) -> (~q -> ~p)')).toBe('tautology');
    });

    test('((p -> q) & (q -> r)) -> (p -> r) is a tautology (hypothetical syllogism)', () => {
      expect(engine.classify('((p -> q) & (q -> r)) -> (p -> r)')).toBe('tautology');
    });

    test('(p & q) -> p is a tautology (simplification)', () => {
      expect(engine.classify('(p & q) -> p')).toBe('tautology');
    });

    test('p -> (p | q) is a tautology (addition)', () => {
      expect(engine.classify('p -> (p | q)')).toBe('tautology');
    });

    test('(p <-> q) <-> (q <-> p) is a tautology (biconditional symmetry)', () => {
      expect(engine.classify('(p <-> q) <-> (q <-> p)')).toBe('tautology');
    });
  });

  describe('classify() — contradictions', () => {
    test('p & ~p is a contradiction', () => {
      expect(engine.classify('p & ~p')).toBe('contradiction');
    });

    test('~(p | ~p) is a contradiction', () => {
      expect(engine.classify('~(p | ~p)')).toBe('contradiction');
    });

    test('(p -> q) & p & ~q is a contradiction (modus ponens violation)', () => {
      expect(engine.classify('(p -> q) & p & ~q')).toBe('contradiction');
    });
  });

  describe('classify() — contingencies', () => {
    test('p is a contingency', () => {
      expect(engine.classify('p')).toBe('contingency');
    });

    test('p & q is a contingency', () => {
      expect(engine.classify('p & q')).toBe('contingency');
    });

    test('p | q is a contingency', () => {
      expect(engine.classify('p | q')).toBe('contingency');
    });

    test('p -> q is a contingency', () => {
      expect(engine.classify('p -> q')).toBe('contingency');
    });

    test('p <-> q is a contingency', () => {
      expect(engine.classify('p <-> q')).toBe('contingency');
    });
  });

  // ── truthTable() ───────────────────────────────────────────────────────────

  describe('truthTable()', () => {
    test('single variable produces 2 rows', () => {
      const tt = engine.truthTable('p');
      expect(tt.rows).toHaveLength(2);
    });

    test('two variables produce 4 rows', () => {
      const tt = engine.truthTable('p & q');
      expect(tt.rows).toHaveLength(4);
    });

    test('three variables produce 8 rows', () => {
      const tt = engine.truthTable('p & q & r');
      expect(tt.rows).toHaveLength(8);
    });

    test('variables field lists exactly the letters in the formula', () => {
      const tt = engine.truthTable('p & q');
      expect(tt.variables).toContain('p');
      expect(tt.variables).toContain('q');
      expect(tt.variables).toHaveLength(2);
    });

    test('tautology has all rows with value true', () => {
      const tt = engine.truthTable('p | ~p');
      expect(tt.rows.every(r => r.value)).toBe(true);
    });

    test('contradiction has all rows with value false', () => {
      const tt = engine.truthTable('p & ~p');
      expect(tt.rows.every(r => !r.value)).toBe(true);
    });

    test('contingency has both true and false rows', () => {
      const tt = engine.truthTable('p');
      expect(tt.rows.some(r => r.value)).toBe(true);
      expect(tt.rows.some(r => !r.value)).toBe(true);
    });

    test('p -> q: only false when p=T, q=F', () => {
      const tt = engine.truthTable('p -> q');
      const falseRows = tt.rows.filter(r => !r.value);
      expect(falseRows).toHaveLength(1);
      expect(falseRows[0].assignment['p']).toBe(true);
      expect(falseRows[0].assignment['q']).toBe(false);
    });

    test('each row assignment contains all variables', () => {
      const tt = engine.truthTable('p & q');
      tt.rows.forEach(row => {
        expect('p' in row.assignment).toBe(true);
        expect('q' in row.assignment).toBe(true);
      });
    });
  });

  // ── evaluate() with WFF instance ──────────────────────────────────────────

  describe('evaluate() — with pre-parsed WFF', () => {
    test('classifies a tautology correctly', () => {
      const { formula, variables } = syntax.parse('p | ~p');
      const result = engine.evaluate(formula, variables);
      expect(result.classification).toBe('tautology');
    });

    test('classifies a contradiction correctly', () => {
      const { formula, variables } = syntax.parse('p & ~p');
      const result = engine.evaluate(formula, variables);
      expect(result.classification).toBe('contradiction');
    });

    test('classifies a contingency correctly', () => {
      const { formula, variables } = syntax.parse('p -> q');
      const result = engine.evaluate(formula, variables);
      expect(result.classification).toBe('contingency');
    });

    test('truth table rows match manual evaluation', () => {
      const { formula, variables } = syntax.parse('p & q');
      const result = engine.evaluate(formula, variables);
      // p=F, q=F → F; p=F, q=T → F; p=T, q=F → F; p=T, q=T → T
      const trueRows = result.truthTable.rows.filter(r => r.value);
      expect(trueRows).toHaveLength(1);
      expect(trueRows[0].assignment['p']).toBe(true);
      expect(trueRows[0].assignment['q']).toBe(true);
    });
  });

  // ── evaluateString() ───────────────────────────────────────────────────────

  describe('evaluateString()', () => {
    test('returns both classification and truth table', () => {
      const result = engine.evaluateString('p -> p');
      expect(result.classification).toBe('tautology');
      expect(result.truthTable.rows).toHaveLength(2);
    });

    test('throws SyntaxError for malformed formula', () => {
      expect(() => engine.evaluateString('p &')).toThrow(SyntaxError);
    });
  });
});
