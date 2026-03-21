import { Atom, Complex, WFF } from './propositionalTypes';

const binaryOperatorToLogic = {
  '&': (a: boolean, b: boolean) => a && b,
  '|': (a: boolean, b: boolean) => a || b,
  '->': (a: boolean, b: boolean) => !a || b,
  '<->': (a: boolean, b: boolean) => a === b
};

const isAtom: (wff: WFF) => boolean = (wff: WFF) => {
  return (wff as Atom).proposition !== undefined;
}

const isComplex: (wff: WFF)=> boolean = (wff: WFF) => {
  return (wff as Complex).left !== undefined || (wff as Complex).binaryOperator !== undefined;
}

export { binaryOperatorToLogic, isAtom, isComplex};