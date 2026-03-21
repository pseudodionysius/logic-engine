import { AtomImpl } from './atom';

/**
 * A named propositional variable with a mutable truth value.
 *
 * Multiple AtomImpl instances produced by `.atom()` share the same
 * underlying value via a closure. Reassigning the variable with `.assign()`
 * immediately affects every atom derived from it — enabling coherent
 * truth-value assignment across an entire PropositionalTheory.
 */
export class PropositionalVariable {

  /** The immutable name of this variable, used for display and graph output. */
  readonly name: string;

  private _value = false;

  /**
   * @param name - The logical name for this variable (e.g. 'p', 'q').
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Assign a new truth value to the variable.
   * All atoms derived from this variable are updated immediately.
   *
   * @param value - The truth value to assign.
   */
  assign(value: boolean): void {
    this._value = value;
  }

  /** The variable's current truth value. */
  get current(): boolean {
    return this._value;
  }

  /**
   * Return a new AtomImpl whose proposition is a live read of this variable.
   *
   * @param negated - When true, wraps the atom with the '~' unary operator.
   * @returns A new AtomImpl bound to this variable's current value.
   */
  atom(negated = false): AtomImpl {
    return new AtomImpl(negated ? '~' : undefined, () => this._value);
  }
}
