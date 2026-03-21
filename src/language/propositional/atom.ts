import { Atom, UnaryOperator } from './propositionalTypes';

export class AtomImpl implements Atom {
  
  unaryOperator: UnaryOperator | undefined;
  proposition: boolean | (() => boolean);

  constructor(unaryOperator: UnaryOperator | undefined, proposition: boolean | (() => boolean)) {
    this.unaryOperator = unaryOperator;
    this.proposition = proposition;
  }

  value(): boolean {
    let rv;
    if (typeof this.proposition === 'function') {
      rv =  this.proposition();
    } else {
      rv = this.proposition;
    } 
    return (this.unaryOperator === '~') ? !rv : rv;
  }

}