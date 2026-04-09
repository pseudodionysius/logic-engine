import { QFF, UnaryOperator, Predicate, Term, VariableAssignment } from './quantificationalTypes';

/**
 * Concrete implementation of an atomic quantificational formula.
 *
 * Applies a predicate to a list of terms. Analogous to AtomImpl in
 * propositional logic — this is the smallest truth-evaluable unit
 * in quantificational logic.
 *
 * Example: F(x), Loves(a, y), Mortal(socrates)
 */
export class AtomicFormulaImpl implements QFF {

  /** Optional negation applied to the predicate result. */
  unaryOperator: UnaryOperator | undefined;

  /** The predicate being applied. */
  readonly predicate: Predicate;

  /** The terms (arguments) passed to the predicate. */
  readonly terms: Term[];

  /** Reference to the current variable assignment — set externally before evaluation. */
  private readonly _assignment: VariableAssignment;

  /**
   * @param unaryOperator - Optional '~' to negate the result.
   * @param predicate     - The predicate to apply.
   * @param terms         - The terms to pass to the predicate.
   * @param assignment    - The shared variable assignment map.
   */
  constructor(
    unaryOperator: UnaryOperator | undefined,
    predicate: Predicate,
    terms: Term[],
    assignment: VariableAssignment,
  ) {
    this.unaryOperator = unaryOperator;
    this.predicate = predicate;
    this.terms = terms;
    this._assignment = assignment;
  }

  /**
   * Evaluate the atomic formula.
   * Resolves each term against the current variable assignment, passes the
   * resulting domain elements to the predicate, then applies negation if present.
   */
  value(): boolean {
    const args = this.terms.map(t => t.resolve(this._assignment));
    const rv = this.predicate.holds(...args);
    return (this.unaryOperator === '~') ? !rv : rv;
  }
}
