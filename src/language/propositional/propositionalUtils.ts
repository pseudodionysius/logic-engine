import { Atom, Complex, WFF } from './propositionalTypes';

/**
 * Lookup table mapping each binary operator to its truth-functional semantics
 * as a two-argument boolean function.
 *
 * - `&`   conjunction: true iff both operands are true
 * - `|`   disjunction: true iff at least one operand is true
 * - `->`  material implication: false only when the antecedent is true and the consequent is false
 * - `<->` biconditional: true iff both operands share the same truth value
 */
const binaryOperatorToLogic = {
  '&': (a: boolean, b: boolean) => a && b,
  '|': (a: boolean, b: boolean) => a || b,
  '->': (a: boolean, b: boolean) => !a || b,
  '<->': (a: boolean, b: boolean) => a === b
};

/**
 * Type guard that returns true when the given WFF is an Atom.
 * Detection is based on the presence of the `proposition` property.
 *
 * @param wff - The WFF to test.
 */
const isAtom: (wff: WFF) => boolean = (wff: WFF) => {
  return (wff as Atom).proposition !== undefined;
}

/**
 * Type guard that returns true when the given WFF is a Complex formula.
 * Detection is based on the presence of `left` or `binaryOperator`.
 *
 * @param wff - The WFF to test.
 */
const isComplex: (wff: WFF)=> boolean = (wff: WFF) => {
  return (wff as Complex).left !== undefined || (wff as Complex).binaryOperator !== undefined;
}

export { binaryOperatorToLogic, isAtom, isComplex};
