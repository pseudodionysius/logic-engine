import { AtomImpl } from './atom';

/**
 * A named propositional variable with a mutable truth value.
 *
 * Multiple AtomImpl instances produced by `.atom()` share the same
 * underlying value via a closure. Reassigning the variable with `.assign()`
 * immediately affects every atom that was derived from it — enabling
 * coherent truth-value assignment across an entire PropositionalTheory.
 *
 * Usage:
 *   const p = new PropositionalVariable('p');
 *   const pAtom    = p.atom();       // reads p's current value
 *   const notPAtom = p.atom(true);   // reads ~p
 *   p.assign(true);
 *   pAtom.value()    // → true
 *   notPAtom.value() // → false
 */
export class PropositionalVariable {
  readonly name: string;
  private _value = false;

  constructor(name: string) {
    this.name = name;
  }

  /** Set the variable's truth value. */
  assign(value: boolean): void {
    this._value = value;
  }

  /** The variable's current truth value. */
  get current(): boolean {
    return this._value;
  }

  /**
   * Return a new AtomImpl whose proposition is a live read of this variable.
   * Pass `negated = true` to wrap with the '~' unary operator.
   */
  atom(negated = false): AtomImpl {
    return new AtomImpl(negated ? '~' : undefined, () => this._value);
  }
}
