import { Atom, UnaryOperator } from './propositionalTypes';

/**
 * Concrete implementation of the Atom interface.
 *
 * Holds a single proposition — either a boolean literal or a `() => boolean`
 * thunk — and an optional negation operator. When a thunk is provided, the
 * atom reads its value at evaluation time, enabling live binding to a
 * PropositionalVariable.
 */
export class AtomImpl implements Atom {

  /** Optional negation applied to the proposition at evaluation time. */
  unaryOperator: UnaryOperator | undefined;

  /**
   * The truth bearer for this atom.
   * A boolean literal is evaluated directly; a thunk is called on each
   * invocation of value().
   */
  proposition: boolean | (() => boolean);

  /**
   * @param unaryOperator - Optional '~' operator to negate the result.
   * @param proposition   - A boolean literal or a thunk returning a boolean.
   */
  constructor(unaryOperator: UnaryOperator | undefined, proposition: boolean | (() => boolean)) {
    this.unaryOperator = unaryOperator;
    this.proposition = proposition;
  }

  /**
   * Evaluate the atom.
   * Invokes the thunk if the proposition is a function, then applies negation
   * if the unary operator is '~'.
   */
  value(): boolean {
    let rv;
    if (typeof this.proposition === 'function') {
      rv =  this.proposition();
    } else {
      rv = this.proposition;
    }
    return (this.unaryOperator === '~') ? !rv : rv;
  }

}
