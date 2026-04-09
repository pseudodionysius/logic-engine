import { QFF, UnaryOperator, Quantifier, DomainElement, VariableAssignment } from './quantificationalTypes';

/**
 * Concrete implementation of a quantified formula.
 *
 * This is the construct that distinguishes quantificational from propositional
 * logic. Binds a variable over a finite domain and evaluates the body formula
 * for each element.
 *
 * ∀x.φ(x) — true iff φ is true for every element in the domain
 * ∃x.φ(x) — true iff φ is true for at least one element in the domain
 */
export class QuantifiedFormulaImpl implements QFF {

  /** Optional negation applied to the quantified result. */
  unaryOperator: UnaryOperator | undefined;

  /** The quantifier: ∀ (universal) or ∃ (existential). */
  readonly quantifier: Quantifier;

  /** The name of the bound variable. */
  readonly variableName: string;

  /** The body (scope/matrix) of the quantified formula. */
  readonly body: QFF;

  /** The finite domain of discourse. */
  private readonly _domain: DomainElement[];

  /** The shared variable assignment, mutated during evaluation. */
  private readonly _assignment: VariableAssignment;

  /**
   * @param unaryOperator - Optional '~' to negate the whole quantified result.
   * @param quantifier    - '∀' or '∃'.
   * @param variableName  - The variable being bound.
   * @param body          - The formula in the scope of the quantifier.
   * @param domain        - The finite domain to quantify over.
   * @param assignment    - The shared variable assignment map.
   */
  constructor(
    unaryOperator: UnaryOperator | undefined,
    quantifier: Quantifier,
    variableName: string,
    body: QFF,
    domain: DomainElement[],
    assignment: VariableAssignment,
  ) {
    this.unaryOperator = unaryOperator;
    this.quantifier = quantifier;
    this.variableName = variableName;
    this.body = body;
    this._domain = domain;
    this._assignment = assignment;
  }

  /**
   * Evaluate the quantified formula.
   *
   * For ∀: iterates over every domain element, assigning each to the bound
   * variable and evaluating the body. Returns true iff the body is true for
   * every element. Restores the previous binding after evaluation.
   *
   * For ∃: same iteration but returns true iff the body is true for at least
   * one element.
   */
  value(): boolean {
    const previous = this._assignment.get(this.variableName);
    let rv: boolean;

    if (this.quantifier === '∀') {
      rv = this._domain.every(d => {
        this._assignment.set(this.variableName, d);
        return this.body.value();
      });
    } else {
      rv = this._domain.some(d => {
        this._assignment.set(this.variableName, d);
        return this.body.value();
      });
    }

    // Restore previous binding (or delete if there was none).
    if (previous !== undefined) {
      this._assignment.set(this.variableName, previous);
    } else {
      this._assignment.delete(this.variableName);
    }

    return (this.unaryOperator === '~') ? !rv : rv;
  }
}
