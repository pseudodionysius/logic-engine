import { WFF, Complex, BinaryOperator } from './propositionalTypes';
import { binaryOperatorToLogic } from './propositionalUtils';

/**
 * Concrete implementation of the Complex interface.
 *
 * Joins two WFFs with a binary connective and evaluates them according to
 * standard propositional truth-functional semantics. An optional outer
 * negation operator is applied to the result of the binary operation.
 */
export class ComplexImpl implements Complex {

  /** The left-hand sub-formula. */
  left: WFF;
  /** Optional negation applied to the result of the binary operation. */
  unaryOperator: '~' | undefined;
  /** The binary connective joining left and right. */
  binaryOperator: BinaryOperator;
  /** The right-hand sub-formula. */
  right: WFF;

  /**
   * @param unaryOperator  - Optional '~' to negate the whole formula.
   * @param left           - The left-hand WFF.
   * @param binaryOperator - The connective joining left and right.
   * @param right          - The right-hand WFF.
   */
  constructor(unaryOperator: '~' | undefined, left: WFF, binaryOperator: BinaryOperator, right: WFF) {
    this.left = left;
    this.unaryOperator = unaryOperator;
    this.binaryOperator = binaryOperator;
    this.right = right;
  }

  /**
   * Evaluate the complex formula.
   * Combines left.value() and right.value() via the binary operator's
   * truth-functional semantics, then applies outer negation if present.
   */
  value(): boolean {
    let rv = binaryOperatorToLogic[this.binaryOperator](this.left.value(), this.right.value());
    return (this.unaryOperator === '~') ? !rv : rv;
  }

}
