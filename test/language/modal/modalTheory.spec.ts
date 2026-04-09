import { ModalTheoryBuilder } from '../../../src/language/modal/modalTheoryBuilder';
import { ModalAtomImpl } from '../../../src/language/modal/modalAtom';
import { ModalComplexImpl } from '../../../src/language/modal/modalComplex';
import { ModalFormulaImpl } from '../../../src/language/modal/modalFormula';
import { AlethicAssertoric } from '../../../src/language/shared/types';
import { World } from '../../../src/language/modal/modalTypes';

// ─── Helpers ────────────────────────────────────────────────────────────────

function sentence(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalTheoryBuilder', () => {

  test('proposition() returns the same instance for the same name', () => {
    const builder = new ModalTheoryBuilder();
    const p1 = builder.proposition('p');
    const p2 = builder.proposition('p');
    expect(p1).toBe(p2);
  });

  test('proposition() returns distinct instances for different names', () => {
    const builder = new ModalTheoryBuilder();
    const p = builder.proposition('p');
    const q = builder.proposition('q');
    expect(p).not.toBe(q);
  });

  test('worlds() sets the worlds and is fluent', () => {
    const builder = new ModalTheoryBuilder();
    const result = builder.worlds('w0', 'w1', 'w2');
    expect(result).toBe(builder);
    expect(builder.currentWorlds).toEqual(['w0', 'w1', 'w2']);
  });

  test('accessibility() is fluent', () => {
    const builder = new ModalTheoryBuilder();
    const result = builder.accessibility(() => true);
    expect(result).toBe(builder);
  });

  test('designatedWorld() is fluent', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0');
    const result = builder.designatedWorld('w0');
    expect(result).toBe(builder);
  });

  test('sentence() is fluent (returns this)', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    const result = builder.sentence(sentence('p'), p.atom(), ['p']);
    expect(result).toBe(builder);
  });

  test('build() returns a theory with the added sentences', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p is true'), p.atom(), ['p']);
    const theory = builder.build();
    expect(theory.sentences).toHaveLength(1);
    expect(theory.sentences[0].source.raw).toBe('p is true');
  });

  test('auto-labels sentences φ1, φ2, …', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('φ1');
    expect(theory.sentences[1].label).toBe('φ2');
  });

  test('custom label is used when provided', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p'), p.atom(), ['p'], 'S1');
    const theory = builder.build();
    expect(theory.sentences[0].label).toBe('S1');
  });

  test('fromSentenceSet() throws (not yet implemented)', () => {
    const builder = new ModalTheoryBuilder();
    expect(() => builder.fromSentenceSet({ sentences: [] })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalTheory — checkConsistency()', () => {

  test('single proposition p at a single world — consistent', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p is true'), p.atom(), ['p']);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
    expect(result.witness!['p@w0']).toBe(true);
  });

  test('p & ~p at same world — inconsistent', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
  });

  test('□p requires p at all accessible worlds — consistent when met', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1', 'w2')
      .accessibility((from: World, to: World) => from === 'w0' && (to === 'w1' || to === 'w2'))
      .designatedWorld('w0');

    const p = builder.proposition('p');
    const boxP = new ModalFormulaImpl(
      undefined, '□', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    builder.sentence(sentence('Necessarily p'), boxP, ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
    // Witness must have p true at w1 and w2
    expect(result.witness!['p@w1']).toBe(true);
    expect(result.witness!['p@w2']).toBe(true);
  });

  test('□p & ◇~p — inconsistent (on same accessibility)', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');

    const p = builder.proposition('p');
    const boxP = new ModalFormulaImpl(
      undefined, '□', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );
    const diaNegP = new ModalFormulaImpl(
      undefined, '◇', p.atom(true),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    builder
      .sentence(sentence('Necessarily p'), boxP, ['p'])
      .sentence(sentence('Possibly not p'), diaNegP, ['p']);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(false);
  });

  test('◇p is consistent when there exists an accessible world where p can be true', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');

    const p = builder.proposition('p');
    const diaP = new ModalFormulaImpl(
      undefined, '◇', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    builder.sentence(sentence('Possibly p'), diaP, ['p']);
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });

  test('□p does not entail p in system K (no reflexivity)', () => {
    // □p & ~p should be consistent in K because w0 might not access itself
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1') // w0 does NOT access w0
      .designatedWorld('w0');

    const p = builder.proposition('p');
    const boxP = new ModalFormulaImpl(
      undefined, '□', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    builder
      .sentence(sentence('Necessarily p'), boxP, ['p'])
      .sentence(sentence('Not p'), p.atom(true), ['p']);

    const result = builder.build().checkConsistency();
    // In K, □p & ~p is satisfiable: p false at w0, p true at w1
    expect(result.isConsistent).toBe(true);
  });

  test('theory with no propositions and no sentences — consistent (vacuously)', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });

  test('multi-proposition modal theory', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');

    const p = builder.proposition('p');
    const q = builder.proposition('q');

    // □(p -> q): necessarily, if p then q
    const impl = new ModalComplexImpl(undefined, p.atom(), '->', q.atom());
    const boxImpl = new ModalFormulaImpl(
      undefined, '□', impl,
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    // ◇p: possibly p
    const diaP = new ModalFormulaImpl(
      undefined, '◇', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    // ◇q: possibly q
    const diaQ = new ModalFormulaImpl(
      undefined, '◇', q.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );

    builder
      .sentence(sentence('Necessarily if p then q'), boxImpl, ['p', 'q'])
      .sentence(sentence('Possibly p'), diaP, ['p'])
      .sentence(sentence('Possibly q'), diaQ, ['q']);

    const result = builder.build().checkConsistency();
    expect(result.isConsistent).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalTheory — buildProofTree()', () => {

  test('consistent theory root is labelled CONSISTENT ✓', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('CONSISTENT ✓');
  });

  test('inconsistent theory root is labelled INCONSISTENT ✗', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    const tree = builder.build().buildProofTree();
    expect(tree.label).toBe('INCONSISTENT ✗');
  });

  test('proof tree includes Kripke frame node', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);

    const tree = builder.build().buildProofTree();
    const frameNode = tree.children.find(c => c.label === 'Kripke frame:');
    expect(frameNode).toBeDefined();
    expect(frameNode!.children).toHaveLength(3); // Worlds, Accessibility, Designated world
  });

  test('consistent tree has a per-world valuation node', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);

    const tree = builder.build().buildProofTree();
    const worldValuation = tree.children.find(c => c.label === 'Per-world valuation:');
    expect(worldValuation).toBeDefined();
  });

  test('consistent tree has a verification node', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder.sentence(sentence('p'), p.atom(), ['p']);

    const tree = builder.build().buildProofTree();
    const verification = tree.children.find(c => c.label === 'Verification (at designated world):');
    expect(verification).toBeDefined();
    expect(verification!.children).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ModalTheory — printProof() and printGraph()', () => {

  test('printProof() does not throw for consistent theory', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');
    const p = builder.proposition('p');
    const boxP = new ModalFormulaImpl(
      undefined, '□', p.atom(),
      builder.currentWorlds, builder.currentAccessibility, builder.state,
    );
    builder.sentence(sentence('Necessarily p'), boxP, ['p']);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printProof() does not throw for inconsistent theory', () => {
    const builder = new ModalTheoryBuilder();
    builder.worlds('w0').designatedWorld('w0');
    const p = builder.proposition('p');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('~p'), p.atom(true), ['p']);
    expect(() => builder.build().printProof()).not.toThrow();
  });

  test('printGraph() does not throw', () => {
    const builder = new ModalTheoryBuilder();
    builder
      .worlds('w0', 'w1')
      .accessibility((from: World, to: World) => from === 'w0' && to === 'w1')
      .designatedWorld('w0');
    const p = builder.proposition('p');
    const q = builder.proposition('q');
    builder
      .sentence(sentence('p'), p.atom(), ['p'])
      .sentence(sentence('q'), q.atom(), ['q']);
    expect(() => builder.build().printGraph()).not.toThrow();
  });
});
