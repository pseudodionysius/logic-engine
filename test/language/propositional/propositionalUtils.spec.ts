import { BinaryOperator } from '../../../src/language/propositional/propositionalTypes';
import { binaryOperatorToLogic } from '../../../src/language/propositional/propositionalUtils';

describe('Propositional Utils Tests', () => {
 
  describe('Binary Operator to Logic', () => {

    test('Logical AND', () => {
      const and: BinaryOperator = '&';
      expect(binaryOperatorToLogic[and](true, true)).toBe(true);
      expect(binaryOperatorToLogic[and](true, false)).toBe(false);
      expect(binaryOperatorToLogic[and](false, true)).toBe(false);
      expect(binaryOperatorToLogic[and](false, false)).toBe(false);
    });

    test('Logical OR', () => {
      const or: BinaryOperator = '|';
      expect(binaryOperatorToLogic[or](true, true)).toBe(true);
      expect(binaryOperatorToLogic[or](true, false)).toBe(true);
      expect(binaryOperatorToLogic[or](false, true)).toBe(true);
      expect(binaryOperatorToLogic[or](false, false)).toBe(false);
    });

    test('Logical Material Implication', () => {
      const materialImplication: BinaryOperator = '->';
      expect(binaryOperatorToLogic[materialImplication](true, true)).toBe(true);
      expect(binaryOperatorToLogic[materialImplication](true, false)).toBe(false);
      expect(binaryOperatorToLogic[materialImplication](false, true)).toBe(true);
      expect(binaryOperatorToLogic[materialImplication](false, false)).toBe(true);
    });

    test('Logical Biconditional', () => {
      const biconditional: BinaryOperator = '<->';
      expect(binaryOperatorToLogic[biconditional](true, true)).toBe(true);
      expect(binaryOperatorToLogic[biconditional](true, false)).toBe(false);
      expect(binaryOperatorToLogic[biconditional](false, true)).toBe(false);
      expect(binaryOperatorToLogic[biconditional](false, false)).toBe(true);
    });
    
  });

});