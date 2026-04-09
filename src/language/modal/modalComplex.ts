import { MFF, BinaryOperator, UnaryOperator } from './modalTypes';

/** Binary operator truth-functional semantics (local to avoid module resolution issues). */
const binaryOperatorToLogic: Record<string, (a: boolean, b: boolean) => boolean> = {
  '&': (a, b) => a && b,
  '|': (a, b) => a || b,
  '->': (a, b) => !a || b,
  '<->': (a, b) => a === b,
};

/**
 * Concrete implementation of a complex modal formula.
 *
 * Joins two MFFs with a binary connective and evaluates them according to
 * standard truth-functional semantics. An optional outer negation operator
 * is applied to the result of the binary operation.
 *
 * Structurally identical to propositional ComplexImpl and quantificational
 * ComplexFormulaImpl.
 */
export class ModalComplexImpl implements MFF {

  /** The left-hand sub-formula. */
  left: MFF;
  /** Optional negation applied to the result of the binary operation. */
  unaryOperator: UnaryOperator | undefined;
  /** The binary connective joining left and right. */
  binaryOperator: BinaryOperator;
  /** The right-hand sub-formula. */
  right: MFF;

  /**
   * @param unaryOperator  - Optional '~' to negate the whole formula.
   * @param left           - The left-hand MFF.
   * @param binaryOperator - The connective joining left and right.
   * @param right          - The right-hand MFF.
   */
  constructor(unaryOperator: UnaryOperator | undefined, left: MFF, binaryOperator: BinaryOperator, right: MFF) {
    this.left = left;
    this.unaryOperator = unaryOperator;
    this.binaryOperator = binaryOperator;
    this.right = right;
  }

  /**
   * Evaluate the complex formula at the current world.
   * Combines left.value() and right.value() via the binary operator's
   * truth-functional semantics, then applies outer negation if present.
   */
  value(): boolean {
    const rv = binaryOperatorToLogic[this.binaryOperator](this.left.value(), this.right.value());
    return (this.unaryOperator === '~') ? !rv : rv;
  }
}
