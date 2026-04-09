import { Formula } from '../shared/types';

/**
 * A possible world identifier.
 * Worlds are the points of evaluation in Kripke semantics.
 */
type World = string;

/**
 * The modal operators.
 *
 * □ := Necessity — "necessarily" — true at w iff true at all accessible worlds
 * ◇ := Possibility — "possibly" — true at w iff true at some accessible world
 */
type ModalOperator = '□' | '◇';

/**
 * The only unary logical operator.
 * Operates on a single formula and negates its truth value.
 *
 * ~ := NOT
 */
type UnaryOperator = '~';

/**
 * Binary logical connectives that join two formulas into a composite formula.
 *
 * &   := AND (conjunction)
 * |   := OR (disjunction)
 * ->  := Material Implication (if … then …)
 * <-> := Biconditional (if and only if)
 */
type BinaryOperator = '&' | '|' | '->' | '<->';

/**
 * Shared mutable state for modal formula evaluation.
 *
 * All formulas in a modal theory reference the same state object.
 * The theory mutates `currentWorld` and `valuation` during consistency
 * checking, and modal operators mutate `currentWorld` when traversing
 * the accessibility relation.
 */
interface ModalEvaluationState {
  /** The world at which formulas are currently being evaluated. */
  currentWorld: World;
  /** For each proposition name, the set of worlds where it is true. */
  valuation: Map<string, Set<World>>;
}

/**
 * A Modal Formula — the union of all valid modal logic expressions.
 * Every syntactically correct modal expression satisfies this type.
 *
 * Analogous to WFF (propositional) and QFF (quantificational).
 */
interface MFF extends Formula {
  /** Optional negation applied to the formula before evaluation. */
  unaryOperator: UnaryOperator | undefined;
  /** Evaluate the formula at the current world in the current model. */
  value(): boolean;
}

/**
 * The modal system determining which frame conditions are enforced.
 * Currently only K (no conditions) is implemented.
 */
type ModalSystem = 'K';

export {
  World,
  ModalOperator,
  UnaryOperator,
  BinaryOperator,
  ModalEvaluationState,
  MFF,
  ModalSystem,
};
