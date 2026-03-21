import { ComplexImpl } from '../../../src/language/propositional/complex';
import { PropositionalTheoryBuilder } from '../../../src/language/propositional/propositionalTheoryBuilder';
import { AlethicAssertoric } from '../../../src/language/shared/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sentence(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PropositionalTheoryBuilder', () => {

  test('variable() returns the same instance for the same name', () => {
    const builder = new PropositionalTheoryBuilder();
    const p1 = builder.variable('p');
    const p2 = builder.variable('p');
    expect(p1).toBe(p2);
  });

  test('variable() returns distinct instances for different names', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    expect(p).not.toBe(q);
  });

  test('sentence() is fluent (returns this)', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const result = builder.sentence(sentence('p'), p.atom(), ['p']);
    expect(result).toBe(builder);
  });

  test('build() returns a PropositionalTheory with the added sentences', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);
    const theory = builder.build();
    expect(theory.sentences).toHaveLength(1);
    expect(theory.sentences[0].source.raw).toBe('p');
  });

  test('auto-labels sentences φ₁, φ₂, …', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('q'), q.atom(), ['q']);
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('φ1');
    expect(theory.sentences[1].label).toBe('φ2');
  });

  test('custom label is used when provided', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder.sentence(sentence('p'), p.atom(), ['p'], 'P1');
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('P1');
  });

  test('fromSentenceSet() throws (not yet implemented)', () => {
    const builder = new PropositionalTheoryBuilder();
    expect(() => builder.fromSentenceSet({ sentences: [] })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PropositionalTheory — checkConsistency()', () => {

  test('single true atom is consistent', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder.sentence(sentence('p is true'), p.atom(), ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
    expect(result.witness).toBeDefined();
  });

  test('single atom (p) is consistent — witness has p = true', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
    expect(result.witness!['p']).toBe(true);
  });

  test('p & ~p (contradiction) is inconsistent', () => {
    const builder = new PropositionalTheoryBuilder();
    const p    = builder.variable('p');
    const lnc  = new ComplexImpl(undefined, p.atom(), '&', p.atom(true));
    builder.sentence(sentence('p and not p'), lnc, ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
    expect(result.failedValuations).toHaveLength(2);
  });

  test('{p, ~p} (pair of contradictory sentences) is inconsistent', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder
      .sentence(sentence('p'),  p.atom(),      ['p'])
      .sentence(sentence('~p'), p.atom(true),  ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
    expect(result.failedValuations).toHaveLength(2);
  });

  test('{p, q} is consistent — both can be true', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('q'), q.atom(), ['q']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
    expect(result.witness!['p']).toBe(true);
    expect(result.witness!['q']).toBe(true);
  });

  test('{p, p -> q, ~q} is inconsistent (modus ponens contradiction)', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'),         p.atom(),                                      ['p'])
      .sentence(sentence('p -> q'),    new ComplexImpl(undefined, p.atom(), '->', q.atom()), ['p', 'q'])
      .sentence(sentence('not q'),     q.atom(true),                                  ['q']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
  });

  test('{p, p -> q, q} is consistent (modus ponens)', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'),       p.atom(),                                          ['p'])
      .sentence(sentence('p -> q'), new ComplexImpl(undefined, p.atom(), '->', q.atom()), ['p', 'q'])
      .sentence(sentence('q'),       q.atom(),                                          ['q']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });

  test('inconsistent result records a firstFailure label for every valuation', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder
      .sentence(sentence('p'),  p.atom(),     ['p'], 'S1')
      .sentence(sentence('~p'), p.atom(true), ['p'], 'S2');
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
    result.failedValuations!.forEach(fv => {
      expect(['S1', 'S2']).toContain(fv.firstFailure);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PropositionalTheory — buildProofTree()', () => {

  test('consistent theory root is labelled CONSISTENT ✓', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('CONSISTENT ✓');
  });

  test('inconsistent theory root is labelled INCONSISTENT ✗', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder
      .sentence(sentence('p'),  p.atom(),     ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('INCONSISTENT ✗');
  });

  test('consistent tree has a Verification child with one entry per sentence', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('q'), q.atom(), ['q']);
    const tree = builder.build().buildProofTree();
    const verification = tree.children.find(c => c.label === 'Verification:');
    expect(verification).toBeDefined();
    expect(verification!.children).toHaveLength(2);
  });

  test('inconsistent tree exhaustion child has one entry per failed valuation', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder
      .sentence(sentence('p'),  p.atom(),     ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    const tree = builder.build().buildProofTree();
    const exhaustion = tree.children.find(c => c.label.startsWith('No satisfying'));
    expect(exhaustion).toBeDefined();
    expect(exhaustion!.children).toHaveLength(2); // 2^1 = 2 valuations
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PropositionalTheory — printProof() and printGraph()', () => {

  test('printProof() does not throw for a consistent theory', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('q'), q.atom(), ['q']);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printProof() does not throw for an inconsistent theory', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    builder
      .sentence(sentence('p'),  p.atom(),     ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printGraph() does not throw', () => {
    const builder = new PropositionalTheoryBuilder();
    const p = builder.variable('p');
    const q = builder.variable('q');
    builder
      .sentence(sentence('It is raining'), p.atom(), ['p'])
      .sentence(sentence('If raining, wet'), new ComplexImpl(undefined, p.atom(), '->', q.atom()), ['p', 'q'])
      .sentence(sentence('It is wet'), q.atom(), ['q']);
    expect(() => builder.build().printGraph()).not.toThrow();
  });
});
