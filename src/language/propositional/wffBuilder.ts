import { WFF } from './propositionalTypes';
import { ComplexImpl } from './complex';
import { AtomImpl } from './atom';
import { isAtom, isComplex } from './propositionalUtils';

export class WFFBuilder {
  
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