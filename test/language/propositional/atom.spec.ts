import { AtomImpl } from '../../../src/language/propositional/atom';

describe('Atom Tests', () => {

  test('should accept boolean inputs', () => {
    let atom = new AtomImpl(undefined, true);
    expect(atom.value()).toBe(true);
    atom = new AtomImpl(undefined, false);    
    expect(atom.value()).toBe(false);
  });

  test('should accept truth evaluable expressions as inputs', () => {
    let atom = new AtomImpl(undefined, () => { return 2+2 === 4});
    expect(atom.value()).toBe(true);
    atom = new AtomImpl(undefined, () => { return 2 < 5});
    expect(atom.value()).toBe(true);
    atom = new AtomImpl(undefined, () => { return "mystring".includes("my") });
    expect(atom.value()).toBe(true);
    atom = new AtomImpl(undefined, () => { return 2+2 === 5});    
    expect(atom.value()).toBe(false);
    atom = new AtomImpl(undefined, () => { return 2 > 5});    
    expect(atom.value()).toBe(false);
  });

  test('should apply unary operators', () => {
    let atom = new AtomImpl('~', true);
    expect(atom.value()).toBe(false);
    atom = new AtomImpl(undefined, true);
    expect(atom.value()).toBe(true);
  });

});

