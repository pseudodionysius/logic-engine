import { Predicate, DomainElement } from './quantificationalTypes';

/**
 * Concrete implementation of the Predicate interface.
 *
 * An n-ary relation over domain elements. The interpretation function
 * determines which tuples of domain elements satisfy the predicate.
 *
 * Examples:
 *   - Unary:  "is mortal" — `new PredicateImpl('Mortal', 1, (x) => mortals.has(x))`
 *   - Binary: "loves"     — `new PredicateImpl('Loves', 2, (x, y) => ...)`
 */
export class PredicateImpl implements Predicate {

  /** The name of this predicate. */
  readonly name: string;

  /** The number of arguments this predicate expects. */
  readonly arity: number;

  /** The interpretation function that determines truth for given arguments. */
  private readonly _holds: (...args: DomainElement[]) => boolean;

  /**
   * @param name  - Display name for the predicate.
   * @param arity - Number of arguments expected.
   * @param holds - Interpretation function mapping domain elements to a truth value.
   */
  constructor(name: string, arity: number, holds: (...args: DomainElement[]) => boolean) {
    this.name = name;
    this.arity = arity;
    this._holds = holds;
  }

  /**
   * Determine whether the predicate holds for the given domain elements.
   * Throws if the number of arguments does not match the declared arity.
   */
  holds(...args: DomainElement[]): boolean {
    if (args.length !== this.arity) {
      throw new Error(
        `Predicate '${this.name}' has arity ${this.arity} but received ${args.length} argument(s).`
      );
    }
    return this._holds(...args);
  }
}

/**
 * Built-in identity (equality) predicate: holds when both arguments
 * denote the same domain element.
 *
 * Formally redundant — any user can define `new PredicateImpl('=', 2, (x, y) => x === y)`.
 * Provided for convenience since identity statements are ubiquitous in
 * first-order logic (e.g. "Hesperus = Phosphorus", ∀x.(x = x)).
 *
 * Usage:
 *   new AtomicFormulaImpl(undefined, IDENTITY, [termA, termB], assignment)
 */
export const IDENTITY = new PredicateImpl('=', 2, (x, y) => x === y);
