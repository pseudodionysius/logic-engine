import { WFF } from './propositionalTypes';
import { ComplexImpl } from './complex';
import { AtomImpl } from './atom';
import { isAtom, isComplex } from './propositionalUtils';

/**
 * Factory that constructs the correct concrete WFF implementation from a
 * plain object matching the WFF shape.
 *
 * Useful when deserialising formula objects from JSON or when the caller
 * holds a WFF-shaped value of unknown concrete type.
 */
export class WFFBuilder {

  /**
   * Inspect the given WFF-shaped object and return the appropriate concrete
   * implementation.
   *
   * - Returns an AtomImpl when the input has a `proposition` property.
   * - Returns a ComplexImpl when the input has `left`, `binaryOperator`, and `right`.
   * - Returns an empty object cast to WFF if neither condition is met.
   *
   * @param args - A WFF-shaped object to inspect.
   * @returns    The concrete AtomImpl, ComplexImpl, or an empty WFF shell.
   */
  getWFF: (args: WFF) => WFF = (args: WFF): WFF => {

    if(isAtom(args) && args?.proposition) {
      return new AtomImpl(args.unaryOperator, args.proposition);
    }

    if(isComplex(args) && args?.left && args?.binaryOperator && args?.right) {
      return new ComplexImpl(args.unaryOperator, args.left, args.binaryOperator, args.right);
    }

    return {} as WFF;

  };

}
