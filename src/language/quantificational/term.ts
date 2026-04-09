import { Term, DomainElement, VariableAssignment } from './quantificationalTypes';

/**
 * A variable term — resolves to whatever domain element the variable is
 * currently assigned to in the variable assignment.
 *
 * Analogous to how a PropositionalVariable's atom reads a mutable value
 * via closure — here the variable looks up its current binding in the
 * assignment map.
 */
export class VariableTerm implements Term {

  /** The name of the individual variable (e.g. 'x', 'y'). */
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Resolve the variable by looking up its name in the assignment.
   * Throws if the variable is unbound (not present in the assignment).
   */
  resolve(assignment: VariableAssignment): DomainElement {
    if (!assignment.has(this.name)) {
      throw new Error(`Unbound variable: '${this.name}'`);
    }
    return assignment.get(this.name)!;
  }
}

/**
 * A constant term — always resolves to its fixed domain element,
 * regardless of the variable assignment.
 */
export class ConstantTerm implements Term {

  /** The fixed domain element this constant denotes. */
  readonly element: DomainElement;

  constructor(element: DomainElement) {
    this.element = element;
  }

  /** Constants ignore the assignment — they always return their fixed element. */
  resolve(_assignment: VariableAssignment): DomainElement {
    return this.element;
  }
}
