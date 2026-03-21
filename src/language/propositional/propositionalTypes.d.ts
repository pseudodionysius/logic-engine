import { Formula } from '../shared/types';

/**
 * Unary Logical operators function on a single
 * truth evaluable statement (WFF - Well Formed Formula)
 * 
 * ~ := NOT
 */
type UnaryOperator = '~';

/**
 * Binary Logical operators function as connectives 
 * between two truth evaluable statements (WFFS - Well Formed Formulas)
 * 
 * & := AND 
 * | := OR
 * -> := Material Implication (if ... then ...)
 * <-> := Biconditional (if and only if)
 */
type BinaryOperator = '&' | '|' | '->' | '<->';

interface WFF extends Atom, Complex {} 

interface Atom extends Formula {
  unaryOperator: UnaryOperator | undefined;
  proposition?: boolean | (() => boolean);
  value: () => boolean;
}

interface Complex extends Formula {
  unaryOperator: UnaryOperator | undefined;
  left?: WFF;
  binaryOperator?: BinaryOperator;
  right?: WFF;
  value: () => boolean;
}

export { WFF, Atom, Complex, UnaryOperator, BinaryOperator };
