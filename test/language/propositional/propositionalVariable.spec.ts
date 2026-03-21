import { PropositionalVariable } from '../../../src/language/propositional/propositionalVariable';

describe('PropositionalVariable', () => {

  describe('construction', () => {
    test('stores the given name', () => {
      const p = new PropositionalVariable('p');
      expect(p.name).toBe('p');
    });

    test('initial value is false', () => {
      const p = new PropositionalVariable('p');
      expect(p.current).toBe(false);
    });
  });

  describe('assign()', () => {
    test('sets current to true', () => {
      const p = new PropositionalVariable('p');
      p.assign(true);
      expect(p.current).toBe(true);
    });

    test('sets current to false after true', () => {
      const p = new PropositionalVariable('p');
      p.assign(true);
      p.assign(false);
      expect(p.current).toBe(false);
    });
  });

  describe('atom()', () => {
    test('created atom reflects the variable\'s current value', () => {
      const p    = new PropositionalVariable('p');
      const atom = p.atom();
      expect(atom.value()).toBe(false);
    });

    test('atom value updates live when the variable is reassigned', () => {
      const p    = new PropositionalVariable('p');
      const atom = p.atom();
      p.assign(true);
      expect(atom.value()).toBe(true);
      p.assign(false);
      expect(atom.value()).toBe(false);
    });

    test('multiple atoms from the same variable are all updated by assign()', () => {
      const p = new PropositionalVariable('p');
      const a1 = p.atom();
      const a2 = p.atom();
      p.assign(true);
      expect(a1.value()).toBe(true);
      expect(a2.value()).toBe(true);
    });

    test('atom(true) creates a negated atom', () => {
      const p    = new PropositionalVariable('p');
      const notP = p.atom(true);
      expect(notP.value()).toBe(true);   // ~false = true
      p.assign(true);
      expect(notP.value()).toBe(false);  // ~true  = false
    });

    test('atom() and atom(true) are logical complements', () => {
      const p    = new PropositionalVariable('p');
      const pos  = p.atom();
      const neg  = p.atom(true);
      for (const v of [false, true]) {
        p.assign(v);
        expect(pos.value()).toBe(!neg.value());
      }
    });
  });
});
