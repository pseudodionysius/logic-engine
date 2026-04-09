import { VariableAssignment, DomainElement } from './quantificationalTypes';
import { VariableTerm } from './term';
import { AtomicFormulaImpl } from './atomicFormula';
import { PredicateImpl } from './predicate';

/**
 * A named individual variable with a mutable domain-element binding.
 *
 * Analogous to PropositionalVariable. All terms and atomic formulas created
 * from this variable share the same underlying assignment map, so updating
 * the variable's binding (by mutating the assignment) updates every derived
 * formula simultaneously.
 *
 * Used by QuantificationalTheory to iterate over domain assignments during
 * consistency checking, and by QuantifiedFormulaImpl to bind variables
 * during quantifier evaluation.
 */
export class QuantificationalVariable {

  /** The immutable name of this variable, used for display and graph output. */
  readonly name: string;

  /** The shared variable assignment map this variable participates in. */
  private readonly _assignment: VariableAssignment;

  /**
   * @param name       - The logical name for this variable (e.g. 'x', 'y').
   * @param assignment - The shared variable assignment map.
   */
  constructor(name: string, assignment: VariableAssignment) {
    this.name = name;
    this._assignment = assignment;
  }

  /**
   * Assign a domain element to this variable.
   * All formulas referencing this variable are updated immediately.
   */
  assign(element: DomainElement): void {
    this._assignment.set(this.name, element);
  }

  /** The variable's current assigned domain element, or undefined if unbound. */
  get current(): DomainElement | undefined {
    return this._assignment.get(this.name);
  }

  /**
   * Return a new VariableTerm referencing this variable.
   * The term resolves to whatever element is currently assigned.
   */
  term(): VariableTerm {
    return new VariableTerm(this.name);
  }

  /**
   * Create an atomic formula applying a predicate to this variable's term.
   * Convenience shortcut for unary predicates.
   *
   * @param predicate - The predicate to apply.
   * @param negated   - When true, wraps the formula with '~'.
   */
  atomicFormula(predicate: PredicateImpl, negated = false): AtomicFormulaImpl {
    return new AtomicFormulaImpl(
      negated ? '~' : undefined,
      predicate,
      [this.term()],
      this._assignment,
    );
  }
}
