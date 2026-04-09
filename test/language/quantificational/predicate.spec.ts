import { PredicateImpl, IDENTITY } from '../../../src/language/quantificational/predicate';

describe('Predicate Tests', () => {

  describe('unary predicates', () => {

    test('unary predicate holds for matching element', () => {
      const mortals = new Set(['socrates', 'plato']);
      const Mortal = new PredicateImpl('Mortal', 1, (x) => mortals.has(x as string));
      expect(Mortal.holds('socrates')).toBe(true);
      expect(Mortal.holds('plato')).toBe(true);
    });

    test('unary predicate does not hold for non-matching element', () => {
      const mortals = new Set(['socrates']);
      const Mortal = new PredicateImpl('Mortal', 1, (x) => mortals.has(x as string));
      expect(Mortal.holds('zeus')).toBe(false);
    });

    test('stores name and arity', () => {
      const F = new PredicateImpl('F', 1, () => true);
      expect(F.name).toBe('F');
      expect(F.arity).toBe(1);
    });
  });

  describe('binary predicates', () => {

    test('binary predicate holds for matching pair', () => {
      const lovesSet = new Set(['socrates,plato']);
      const Loves = new PredicateImpl('Loves', 2, (x, y) => lovesSet.has(`${x},${y}`));
      expect(Loves.holds('socrates', 'plato')).toBe(true);
    });

    test('binary predicate does not hold for non-matching pair', () => {
      const lovesSet = new Set(['socrates,plato']);
      const Loves = new PredicateImpl('Loves', 2, (x, y) => lovesSet.has(`${x},${y}`));
      expect(Loves.holds('plato', 'socrates')).toBe(false);
    });

    test('stores arity 2', () => {
      const R = new PredicateImpl('R', 2, () => true);
      expect(R.arity).toBe(2);
    });
  });

  describe('arity enforcement', () => {

    test('throws when too few arguments are provided', () => {
      const F = new PredicateImpl('F', 2, () => true);
      expect(() => F.holds('a')).toThrow(
        "Predicate 'F' has arity 2 but received 1 argument(s)."
      );
    });

    test('throws when too many arguments are provided', () => {
      const F = new PredicateImpl('F', 1, () => true);
      expect(() => F.holds('a', 'b')).toThrow(
        "Predicate 'F' has arity 1 but received 2 argument(s)."
      );
    });

    test('zero-arity predicate (propositional constant) works', () => {
      const P = new PredicateImpl('P', 0, () => true);
      expect(P.holds()).toBe(true);
    });

    test('zero-arity predicate rejects arguments', () => {
      const P = new PredicateImpl('P', 0, () => true);
      expect(() => P.holds('a')).toThrow(
        "Predicate 'P' has arity 0 but received 1 argument(s)."
      );
    });
  });

  describe('numeric domain elements', () => {

    test('predicates work with numeric elements', () => {
      const Even = new PredicateImpl('Even', 1, (x) => (x as number) % 2 === 0);
      expect(Even.holds(2)).toBe(true);
      expect(Even.holds(4)).toBe(true);
      expect(Even.holds(3)).toBe(false);
    });

    test('binary predicate with numeric ordering', () => {
      const LessThan = new PredicateImpl('LessThan', 2, (x, y) => (x as number) < (y as number));
      expect(LessThan.holds(1, 2)).toBe(true);
      expect(LessThan.holds(2, 1)).toBe(false);
      expect(LessThan.holds(1, 1)).toBe(false);
    });
  });

  describe('IDENTITY (built-in equality predicate)', () => {

    test('holds when both arguments are the same string element', () => {

      expect(IDENTITY.holds('socrates', 'socrates')).toBe(true);
    });

    test('does not hold when arguments are different string elements', () => {

      expect(IDENTITY.holds('socrates', 'plato')).toBe(false);
    });

    test('holds when both arguments are the same numeric element', () => {

      expect(IDENTITY.holds(42, 42)).toBe(true);
    });

    test('does not hold for different numeric elements', () => {

      expect(IDENTITY.holds(1, 2)).toBe(false);
    });

    test('Hesperus = Phosphorus: two names, same referent', () => {

      // Both names denote Venus — identity holds
      const hesperus = 'venus';
      const phosphorus = 'venus';
      expect(IDENTITY.holds(hesperus, phosphorus)).toBe(true);
    });

    test('has name "=" and arity 2', () => {

      expect(IDENTITY.name).toBe('=');
      expect(IDENTITY.arity).toBe(2);
    });
  });
});
