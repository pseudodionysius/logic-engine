import { Formula } from '../shared/types';

/**
 * The only unary logical operator in propositional logic.
 * Operates on a single WFF and negates its truth value.
 *
 * ~ := NOT
 */
type UnaryOperator = '~';

/**
 * Binary logical connectives that join two WFFs into a composite formula.
 *
 * &   := AND (conjunction)
 * |   := OR (disjunction)
 * ->  := Material Implication (if … then …)
 * <-> := Biconditional (if and only if)
 */
type BinaryOperator = '&' | '|' | '->' | '<->';

/**
 * A Well Formed Formula — the union of all valid propositional expressions.
 * Every syntactically correct propositional expression satisfies this type.
 */
interface WFF extends Atom, Complex {}

/**
 * The smallest truth-evaluable unit in propositional logic.
 * Holds a single proposition and an optional negation operator.
 */
interface Atom extends Formula {
  /** Optional negation applied to the proposition before evaluation. */
  unaryOperator: UnaryOperator | undefined;
  /** The truth bearer: a boolean literal or a thunk that returns one. */
  proposition?: boolean | (() => boolean);
  /** Evaluate the atom, applying negation if present. */
  value: () => boolean;
}

/**
 * A composite formula that joins two WFFs with a binary connective.
 * An optional outer negation operator is applied to the result of the
 * binary operation.
 */
interface Complex extends Formula {
  /** Optional negation applied to the result of the binary operation. */
  unaryOperator: UnaryOperator | undefined;
  /** The left-hand sub-formula. */
  left?: WFF;
  /** The binary connective joining left and right. */
  binaryOperator?: BinaryOperator;
  /** The right-hand sub-formula. */
  right?: WFF;
  /** Evaluate the complex formula, applying negation if present. */
  value: () => boolean;
}

export { WFF, Atom, Complex, UnaryOperator, BinaryOperator };
