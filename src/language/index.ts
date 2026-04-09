// Shared base types
export * from './shared/types';
export * from './shared/theory';

// Propositional logic — establishes the shared operator types
// (BinaryOperator, UnaryOperator, binaryOperatorToLogic) used across all languages.
export * from './propositional/index';

// Quantificational logic — unique exports only; operator types already exported above.
export {
  DomainElement,
  VariableAssignment,
  Term,
  Predicate,
  Quantifier,
  QFF,
} from './quantificational/quantificationalTypes';
export { VariableTerm, ConstantTerm } from './quantificational/term';
export { PredicateImpl, IDENTITY } from './quantificational/predicate';
export { AtomicFormulaImpl } from './quantificational/atomicFormula';
export { ComplexFormulaImpl } from './quantificational/complexFormula';
export { QuantifiedFormulaImpl } from './quantificational/quantifiedFormula';
export { QuantificationalVariable } from './quantificational/quantificationalVariable';
export { isAtomicFormula, isComplexFormula, isQuantifiedFormula } from './quantificational/quantificationalUtils';
export { QuantificationalFormalSentence, QuantificationalTheory } from './quantificational/quantificationalTheory';
export { QuantificationalTheoryBuilder } from './quantificational/quantificationalTheoryBuilder';

// Modal logic — unique exports only; operator types already exported above.
export {
  World,
  ModalOperator,
  ModalEvaluationState,
  MFF,
  ModalSystemSpec,
} from './modal/modalTypes';
export { SystemK, SystemT, SystemD, SystemS4, SystemS5 } from './modal/modalSystems';
export { ModalAtomImpl } from './modal/modalAtom';
export { ModalComplexImpl } from './modal/modalComplex';
export { ModalFormulaImpl } from './modal/modalFormula';
export { ModalVariable } from './modal/modalVariable';
export { isModalAtom, isModalComplex, isModalFormula } from './modal/modalUtils';
export { ModalFormalSentence, ModalTheory } from './modal/modalTheory';
export { ModalTheoryBuilder } from './modal/modalTheoryBuilder';
