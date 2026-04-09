import { VariableTerm, ConstantTerm } from '../../../src/language/quantificational/term';
import { VariableAssignment } from '../../../src/language/quantificational/quantificationalTypes';

describe('Term Tests', () => {

  describe('ConstantTerm', () => {

    test('resolves to its fixed string element regardless of assignment', () => {
      const c = new ConstantTerm('socrates');
      const assignment: VariableAssignment = new Map();
      expect(c.resolve(assignment)).toBe('socrates');
    });

    test('resolves to its fixed numeric element regardless of assignment', () => {
      const c = new ConstantTerm(42);
      const assignment: VariableAssignment = new Map();
      expect(c.resolve(assignment)).toBe(42);
    });

    test('ignores variable assignment entirely', () => {
      const c = new ConstantTerm('a');
      const assignment: VariableAssignment = new Map([['x', 'b']]);
      expect(c.resolve(assignment)).toBe('a');
    });

    test('stores the element on construction', () => {
      const c = new ConstantTerm('plato');
      expect(c.element).toBe('plato');
    });
  });

  describe('VariableTerm', () => {

    test('resolves to the assigned element for its variable name', () => {
      const v = new VariableTerm('x');
      const assignment: VariableAssignment = new Map([['x', 'socrates']]);
      expect(v.resolve(assignment)).toBe('socrates');
    });

    test('resolves to updated value when assignment changes', () => {
      const v = new VariableTerm('x');
      const assignment: VariableAssignment = new Map([['x', 'socrates']]);
      expect(v.resolve(assignment)).toBe('socrates');
      assignment.set('x', 'plato');
      expect(v.resolve(assignment)).toBe('plato');
    });

    test('throws when the variable is unbound', () => {
      const v = new VariableTerm('x');
      const assignment: VariableAssignment = new Map();
      expect(() => v.resolve(assignment)).toThrow("Unbound variable: 'x'");
    });

    test('stores the variable name on construction', () => {
      const v = new VariableTerm('y');
      expect(v.name).toBe('y');
    });

    test('resolves numeric domain elements', () => {
      const v = new VariableTerm('x');
      const assignment: VariableAssignment = new Map([['x', 1]]);
      expect(v.resolve(assignment)).toBe(1);
    });
  });
});
