import { Formula } from '../shared/types';

/**
 * An element of the finite domain of discourse.
 * Domains are finite sets of these values — quantifiers enumerate over them.
 */
type DomainElement = string | number;

/**
 * A mapping from individual variable names to domain elements.
 * Updated during quantifier evaluation to bind variables to specific elements.
 */
type VariableAssignment = Map<string, DomainElement>;

/**
 * A term in quantificational logic — either an individual variable or a constant.
 * Terms denote domain elements; variables are resolved via the current assignment,
 * constants denote fixed elements.
 */
interface Term {
  /** Resolve to a domain element given the current variable assignment. */
  resolve(assignment: VariableAssignment): DomainElement;
}

/**
 * An n-ary predicate (relation) over domain elements.
 * Predicates are the atomic truth-bearers of quantificational logic — they map
 * tuples of domain elements to truth values.
 */
interface Predicate {
  /** The name of this predicate (e.g. 'F', 'Mortal', 'Loves'). */
  name: string;
  /** The number of arguments this predicate takes. */
  arity: number;
  /** Determine whether the predicate holds for the given arguments. */
  holds(...args: DomainElement[]): boolean;
}

/**
 * The quantifiers of first-order logic.
 *
 * ∀ := Universal — "for all"
 * ∃ := Existential — "there exists"
 */
type Quantifier = '∀' | '∃';

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
 * A Quantificational Formula — the union of all valid first-order expressions.
 * Every syntactically correct quantificational expression satisfies this type.
 *
 * Analogous to WFF in propositional logic.
 */
interface QFF extends Formula {
  /** Optional negation applied to the formula before evaluation. */
  unaryOperator: UnaryOperator | undefined;
  /** Evaluate the formula under the current domain and variable assignment. */
  value(): boolean;
}

export {
  DomainElement,
  VariableAssignment,
  Term,
  Predicate,
  Quantifier,
  UnaryOperator,
  BinaryOperator,
  QFF,
};
