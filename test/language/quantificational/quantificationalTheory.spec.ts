import { QuantificationalTheoryBuilder } from '../../../src/language/quantificational/quantificationalTheoryBuilder';
import { AtomicFormulaImpl } from '../../../src/language/quantificational/atomicFormula';
import { ComplexFormulaImpl } from '../../../src/language/quantificational/complexFormula';
import { QuantifiedFormulaImpl } from '../../../src/language/quantificational/quantifiedFormula';
import { ConstantTerm } from '../../../src/language/quantificational/term';
import { AlethicAssertoric } from '../../../src/language/shared/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sentence(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('QuantificationalTheoryBuilder', () => {

  test('variable() returns the same instance for the same name', () => {
    const builder = new QuantificationalTheoryBuilder();
    const x1 = builder.variable('x');
    const x2 = builder.variable('x');
    expect(x1).toBe(x2);
  });

  test('variable() returns distinct instances for different names', () => {
    const builder = new QuantificationalTheoryBuilder();
    const x = builder.variable('x');
    const y = builder.variable('y');
    expect(x).not.toBe(y);
  });

  test('predicate() returns the same instance for the same name', () => {
    const builder = new QuantificationalTheoryBuilder();
    const F1 = builder.predicate('F', 1, () => true);
    const F2 = builder.predicate('F', 1, () => true);
    expect(F1).toBe(F2);
  });

  test('domain() sets the domain and is fluent', () => {
    const builder = new QuantificationalTheoryBuilder();
    const result = builder.domain('a', 'b', 'c');
    expect(result).toBe(builder);
    expect(builder.currentDomain).toEqual(['a', 'b', 'c']);
  });

  test('sentence() is fluent (returns this)', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const formula = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    const result = builder.sentence(sentence('F(a)'), formula, []);
    expect(result).toBe(builder);
  });

  test('build() returns a theory with the added sentences', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const formula = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    builder.sentence(sentence('F(a)'), formula, []);
    const theory = builder.build();
    expect(theory.sentences).toHaveLength(1);
    expect(theory.sentences[0].source.raw).toBe('F(a)');
  });

  test('auto-labels sentences φ1, φ2, …', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const f1 = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    const f2 = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    builder
      .sentence(sentence('F(a)'), f1, [])
      .sentence(sentence('F(a) again'), f2, []);
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('φ1');
    expect(theory.sentences[1].label).toBe('φ2');
  });

  test('custom label is used when provided', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const formula = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    builder.sentence(sentence('F(a)'), formula, [], 'S1');
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('S1');
  });

  test('fromSentenceSet() throws (not yet implemented)', () => {
    const builder = new QuantificationalTheoryBuilder();
    expect(() => builder.fromSentenceSet({ sentences: [] })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('QuantificationalTheory — checkConsistency()', () => {

  test('classic syllogism: All men are mortal, Socrates is a man, Socrates is mortal — consistent', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('socrates', 'plato');

    const Man = builder.predicate('Man', 1, (x) => x === 'socrates' || x === 'plato');
    const Mortal = builder.predicate('Mortal', 1, (x) => x === 'socrates' || x === 'plato');
    const x = builder.variable('x');

    // φ1: ∀x.(Man(x) -> Mortal(x))
    const manX = new AtomicFormulaImpl(undefined, Man, [x.term()], builder.assignment);
    const mortalX = new AtomicFormulaImpl(undefined, Mortal, [x.term()], builder.assignment);
    const impl = new ComplexFormulaImpl(undefined, manX, '->', mortalX);
    const phi1 = new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, builder.currentDomain, builder.assignment);

    // φ2: Man(socrates)
    const phi2 = new AtomicFormulaImpl(undefined, Man, [new ConstantTerm('socrates')], builder.assignment);

    // φ3: Mortal(socrates)
    const phi3 = new AtomicFormulaImpl(undefined, Mortal, [new ConstantTerm('socrates')], builder.assignment);

    builder
      .sentence(sentence('All men are mortal'), phi1, ['x'])
      .sentence(sentence('Socrates is a man'), phi2, [])
      .sentence(sentence('Socrates is mortal'), phi3, []);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });

  test('invalid syllogism: All men are mortal, Socrates is a man, Socrates is NOT mortal — inconsistent', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('socrates', 'plato');

    const Man = builder.predicate('Man', 1, (x) => x === 'socrates' || x === 'plato');
    const Mortal = builder.predicate('Mortal', 1, (x) => x === 'socrates' || x === 'plato');
    const x = builder.variable('x');

    // φ1: ∀x.(Man(x) -> Mortal(x))
    const manX = new AtomicFormulaImpl(undefined, Man, [x.term()], builder.assignment);
    const mortalX = new AtomicFormulaImpl(undefined, Mortal, [x.term()], builder.assignment);
    const impl = new ComplexFormulaImpl(undefined, manX, '->', mortalX);
    const phi1 = new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, builder.currentDomain, builder.assignment);

    // φ2: Man(socrates)
    const phi2 = new AtomicFormulaImpl(undefined, Man, [new ConstantTerm('socrates')], builder.assignment);

    // φ3: ~Mortal(socrates)
    const phi3 = new AtomicFormulaImpl('~', Mortal, [new ConstantTerm('socrates')], builder.assignment);

    builder
      .sentence(sentence('All men are mortal'), phi1, ['x'])
      .sentence(sentence('Socrates is a man'), phi2, [])
      .sentence(sentence('Socrates is NOT mortal'), phi3, []);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
  });

  test('∃x.F(x) is consistent when F holds for some element', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a', 'b', 'c');

    const F = builder.predicate('F', 1, (x) => x === 'b');
    const x = builder.variable('x');
    const Fx = new AtomicFormulaImpl(undefined, F, [x.term()], builder.assignment);
    const phi = new QuantifiedFormulaImpl(undefined, '∃', 'x', Fx, builder.currentDomain, builder.assignment);

    builder.sentence(sentence('Something is F'), phi, ['x']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });

  test('{∀x.F(x), ∃x.~F(x)} is inconsistent', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a', 'b');

    const F = builder.predicate('F', 1, (x) => x === 'a' || x === 'b');
    const x = builder.variable('x');
    const Fx = new AtomicFormulaImpl(undefined, F, [x.term()], builder.assignment);
    const notFx = new AtomicFormulaImpl('~', F, [x.term()], builder.assignment);

    const forallFx = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx, builder.currentDomain, builder.assignment);
    const existsNotFx = new QuantifiedFormulaImpl(undefined, '∃', 'x', notFx, builder.currentDomain, builder.assignment);

    builder
      .sentence(sentence('Everything is F'), forallFx, ['x'])
      .sentence(sentence('Something is not F'), existsNotFx, ['x']);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
  });

  test('theory with no free variables: ground sentence', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('socrates');

    const Mortal = builder.predicate('Mortal', 1, (x) => x === 'socrates');
    const phi = new AtomicFormulaImpl(undefined, Mortal, [new ConstantTerm('socrates')], builder.assignment);

    builder.sentence(sentence('Socrates is mortal'), phi, []);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('QuantificationalTheory — buildProofTree()', () => {

  test('consistent theory root is labelled CONSISTENT ✓', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const phi = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    builder.sentence(sentence('F(a)'), phi, []);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('CONSISTENT ✓');
  });

  test('inconsistent theory root is labelled INCONSISTENT ✗', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    const pos = new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment);
    const neg = new AtomicFormulaImpl('~', F, [new ConstantTerm('a')], builder.assignment);
    builder
      .sentence(sentence('F(a)'), pos, [])
      .sentence(sentence('~F(a)'), neg, []);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('INCONSISTENT ✗');
  });

  test('consistent tree has a Verification child', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    builder.sentence(sentence('F(a)'), new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment), []);
    const tree = builder.build().buildProofTree();
    const verification = tree.children.find(c => c.label === 'Verification:');
    expect(verification).toBeDefined();
    expect(verification!.children).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('QuantificationalTheory — printProof() and printGraph()', () => {

  test('printProof() does not throw for consistent theory', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('socrates', 'plato');
    const Man = builder.predicate('Man', 1, () => true);
    const x = builder.variable('x');
    const Fx = new AtomicFormulaImpl(undefined, Man, [x.term()], builder.assignment);
    const phi = new QuantifiedFormulaImpl(undefined, '∀', 'x', Fx, builder.currentDomain, builder.assignment);
    builder.sentence(sentence('All are men'), phi, ['x']);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printProof() does not throw for inconsistent theory', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('a');
    const F = builder.predicate('F', 1, () => true);
    builder
      .sentence(sentence('F(a)'), new AtomicFormulaImpl(undefined, F, [new ConstantTerm('a')], builder.assignment), [])
      .sentence(sentence('~F(a)'), new AtomicFormulaImpl('~', F, [new ConstantTerm('a')], builder.assignment), []);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printGraph() does not throw', () => {
    const builder = new QuantificationalTheoryBuilder();
    builder.domain('socrates', 'plato');
    const Man = builder.predicate('Man', 1, () => true);
    const Mortal = builder.predicate('Mortal', 1, () => true);
    const x = builder.variable('x');

    const manX = new AtomicFormulaImpl(undefined, Man, [x.term()], builder.assignment);
    const mortalX = new AtomicFormulaImpl(undefined, Mortal, [x.term()], builder.assignment);
    const impl = new ComplexFormulaImpl(undefined, manX, '->', mortalX);
    const phi1 = new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, builder.currentDomain, builder.assignment);
    const phi2 = new AtomicFormulaImpl(undefined, Man, [new ConstantTerm('socrates')], builder.assignment);
    const phi3 = new AtomicFormulaImpl(undefined, Mortal, [new ConstantTerm('socrates')], builder.assignment);

    builder
      .sentence(sentence('All men are mortal'), phi1, ['x'])
      .sentence(sentence('Socrates is a man'), phi2, [])
      .sentence(sentence('Socrates is mortal'), phi3, []);

    expect(() => builder.build().printGraph()).not.toThrow();
  });
});
