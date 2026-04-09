import { MFF } from './modalTypes';

/**
 * Lookup table mapping each binary operator to its truth-functional semantics
 * as a two-argument boolean function.
 *
 * Same semantics as propositional and quantificational — kept local to
 * avoid cross-module coupling.
 */
const binaryOperatorToLogic: Record<string, (a: boolean, b: boolean) => boolean> = {
  '&': (a: boolean, b: boolean) => a && b,
  '|': (a: boolean, b: boolean) => a || b,
  '->': (a: boolean, b: boolean) => !a || b,
  '<->': (a: boolean, b: boolean) => a === b,
};

/**
 * Type guard: returns true when the given MFF has modal atom shape.
 * Uses structural check (presence of 'propositionName' property).
 */
const isModalAtom = (mff: MFF): boolean => {
  return 'propositionName' in mff;
};

/**
 * Type guard: returns true when the given MFF has complex formula shape.
 * Uses structural check to avoid circular dependency with modalComplex.ts.
 */
const isModalComplex = (mff: MFF): boolean => {
  return 'left' in mff && 'binaryOperator' in mff && 'right' in mff;
};

/**
 * Type guard: returns true when the given MFF has modal formula shape (□ or ◇).
 * Uses structural check to avoid circular dependency with modalFormula.ts.
 */
const isModalFormula = (mff: MFF): boolean => {
  return 'modalOperator' in mff && 'body' in mff;
};

export { binaryOperatorToLogic, isModalAtom, isModalComplex, isModalFormula };
