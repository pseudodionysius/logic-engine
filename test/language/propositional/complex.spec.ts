import { AtomImpl } from '../../../src/language/propositional/atom';
import { ComplexImpl } from '../../../src/language/propositional/complex';

describe('Complex Tests', () => {
  
  test('Complexes should apply unary operators to values', () => {
    let complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '&', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl('~', new AtomImpl(undefined, true), '&', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(false);
  });

  test('Complexes should apply logical AND correctly', () => { 
    let complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '&', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '&', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(false);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '&', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(false);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '&', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(false);
  });

  test('Complexes should apply logical OR correctly', () => { 
    let complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '|', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '|', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '|', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '|', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(false);
  });

  test('Complexes should apply logical MATERIAL IMPLICATION correctly', () => { 
    let complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '->', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '->', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(false);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '->', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '->', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(true);
  });

  test('Complexes should apply logical BICONDITIONAL correctly', () => { 
    let complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '<->', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(true);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, true), '<->', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(false);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '<->', new AtomImpl(undefined, true));
    expect(complex.value()).toBe(false);
    complex = new ComplexImpl(undefined, new AtomImpl(undefined, false), '<->', new AtomImpl(undefined, false));
    expect(complex.value()).toBe(true);
  });


});