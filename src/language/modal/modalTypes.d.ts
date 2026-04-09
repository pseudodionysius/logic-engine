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
 * Specification for a modal logic system.
 *
 * A modal system is a set of frame conditions that constrain which Kripke
 * frames are valid for that system. The spec encapsulates both the system
 * name (used in output) and its frame validation logic.
 *
 * Concrete instances live in modalSystems.ts. The language layer
 * (formula evaluation) is entirely system-agnostic — only the theory
 * builder and theory output depend on this interface.
 */
interface ModalSystemSpec {
  /** Display name of the system (e.g. 'K', 'T', 'S4', 'S5'). */
  readonly name: string;
  /**
   * Validate that the given frame satisfies this system's conditions.
   * Throws a descriptive error if any condition is violated.
   *
   * @param worlds        - The set of possible worlds.
   * @param accessibility - The accessibility relation to validate.
   */
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void;
}

export {
  World,
  ModalOperator,
  UnaryOperator,
  BinaryOperator,
  ModalEvaluationState,
  MFF,
  ModalSystemSpec,
};
