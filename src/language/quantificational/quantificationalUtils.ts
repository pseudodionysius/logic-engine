import { QFF } from './quantificationalTypes';

/**
 * Lookup table mapping each binary operator to its truth-functional semantics
 * as a two-argument boolean function.
 *
 * Same semantics as propositional — kept local to avoid cross-module coupling.
 *
 * - `&`   conjunction: true iff both operands are true
 * - `|`   disjunction: true iff at least one operand is true
 * - `->`  material implication: false only when the antecedent is true and the consequent is false
 * - `<->` biconditional: true iff both operands share the same truth value
 */
const binaryOperatorToLogic: Record<string, (a: boolean, b: boolean) => boolean> = {
  '&': (a: boolean, b: boolean) => a && b,
  '|': (a: boolean, b: boolean) => a || b,
  '->': (a: boolean, b: boolean) => !a || b,
  '<->': (a: boolean, b: boolean) => a === b,
};

/**
 * Type guard: returns true when the given QFF has atomic formula shape.
 * Uses structural check (presence of 'predicate' property) to avoid
 * circular dependency with atomicFormula.ts.
 */
const isAtomicFormula = (qff: QFF): boolean => {
  return 'predicate' in qff && 'terms' in qff;
};

/**
 * Type guard: returns true when the given QFF has complex formula shape.
 * Uses structural check to avoid circular dependency with complexFormula.ts.
 */
const isComplexFormula = (qff: QFF): boolean => {
  return 'left' in qff && 'binaryOperator' in qff && 'right' in qff;
};

/**
 * Type guard: returns true when the given QFF has quantified formula shape.
 * Uses structural check to avoid circular dependency with quantifiedFormula.ts.
 */
const isQuantifiedFormula = (qff: QFF): boolean => {
  return 'quantifier' in qff && 'variableName' in qff && 'body' in qff;
};

export { binaryOperatorToLogic, isAtomicFormula, isComplexFormula, isQuantifiedFormula };
