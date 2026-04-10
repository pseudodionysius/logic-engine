import { FormalAnnotator } from '../../../src/engine/nlp/formalAnnotator';
import { AlethicAssertoric } from '../../../src/language/shared/types';

function s(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

describe('FormalAnnotator', () => {
  let annotator: FormalAnnotator;

  beforeEach(() => { annotator = new FormalAnnotator(); });

  describe('annotate() — connective detection', () => {
    test('detects "and" as & operator', () => {
      const result = annotator.annotate(s('The cat is on the mat and the dog is in the garden.'));
      const ops = result.features.connectives.map(c => c.operator);
      expect(ops).toContain('&');
    });

    test('detects "or" as | operator', () => {
      const result = annotator.annotate(s('It is raining or it is snowing.'));
      const ops = result.features.connectives.map(c => c.operator);
      expect(ops).toContain('|');
    });

    test('detects "if" as -> operator', () => {
      const result = annotator.annotate(s('If it is raining then the streets are wet.'));
      const ops = result.features.connectives.map(c => c.operator);
      expect(ops).toContain('->');
    });

    test('detects "if and only if" as <-> operator', () => {
      const result = annotator.annotate(s('P holds if and only if Q holds.'));
      const ops = result.features.connectives.map(c => c.operator);
      expect(ops).toContain('<->');
    });

    test('returns empty connectives array when none detected', () => {
      const result = annotator.annotate(s('Socrates is a man.'));
      expect(result.features.connectives).toHaveLength(0);
    });

    test('connective span references correct position in raw string', () => {
      const raw = 'It is raining and the streets are wet.';
      const result = annotator.annotate(s(raw));
      const conn = result.features.connectives.find(c => c.operator === '&');
      expect(conn).toBeDefined();
      expect(raw.slice(conn!.span[0], conn!.span[1]).toLowerCase()).toContain('and');
    });
  });

  describe('annotate() — quantifier detection', () => {
    test('detects "all" as ∀', () => {
      const result = annotator.annotate(s('All men are mortal.'));
      const qs = result.features.quantifiers.map(q => q.quantifier);
      expect(qs).toContain('∀');
    });

    test('detects "every" as ∀', () => {
      const result = annotator.annotate(s('Every student passed the exam.'));
      const qs = result.features.quantifiers.map(q => q.quantifier);
      expect(qs).toContain('∀');
    });

    test('detects "some" as ∃', () => {
      const result = annotator.annotate(s('Some philosophers are logicians.'));
      const qs = result.features.quantifiers.map(q => q.quantifier);
      expect(qs).toContain('∃');
    });

    test('detects "there exists" as ∃', () => {
      const result = annotator.annotate(s('There exists a proof of the theorem.'));
      const qs = result.features.quantifiers.map(q => q.quantifier);
      expect(qs).toContain('∃');
    });

    test('detects "no" as ¬∃', () => {
      const result = annotator.annotate(s('No mortal is immortal.'));
      const qs = result.features.quantifiers.map(q => q.quantifier);
      expect(qs).toContain('¬∃');
    });

    test('returns empty quantifiers array when none detected', () => {
      const result = annotator.annotate(s('Socrates is a man.'));
      expect(result.features.quantifiers).toHaveLength(0);
    });
  });

  describe('annotate() — modal adverb detection', () => {
    test('detects "necessarily" as □', () => {
      const result = annotator.annotate(s('Necessarily all bachelors are unmarried.'));
      const ops = result.features.modalAdverbs.map(m => m.operator);
      expect(ops).toContain('□');
    });

    test('detects "must" as □', () => {
      const result = annotator.annotate(s('It must be the case that p holds.'));
      const ops = result.features.modalAdverbs.map(m => m.operator);
      expect(ops).toContain('□');
    });

    test('detects "possibly" as ◇', () => {
      const result = annotator.annotate(s('Possibly the theorem is unprovable.'));
      const ops = result.features.modalAdverbs.map(m => m.operator);
      expect(ops).toContain('◇');
    });

    test('detects "might" as ◇', () => {
      const result = annotator.annotate(s('It might be raining outside.'));
      const ops = result.features.modalAdverbs.map(m => m.operator);
      expect(ops).toContain('◇');
    });

    test('returns empty modalAdverbs array when none detected', () => {
      const result = annotator.annotate(s('Socrates is a man.'));
      expect(result.features.modalAdverbs).toHaveLength(0);
    });
  });

  describe('annotate() — negation detection', () => {
    test('detects "not" as negation', () => {
      const result = annotator.annotate(s('The cat is not on the mat.'));
      expect(result.features.negations.length).toBeGreaterThan(0);
    });

    test('detects "it is not the case that" as negation', () => {
      const result = annotator.annotate(s('It is not the case that p is true.'));
      expect(result.features.negations.some(n => n.text.includes('not the case'))).toBe(true);
    });
  });

  describe('annotate() — proposition extraction', () => {
    test('assigns labels starting from p', () => {
      const result = annotator.annotate(s('It is raining and the streets are wet.'));
      const labels = result.features.propositions.map(p => p.label);
      expect(labels[0]).toBe('p');
    });

    test('assigns sequential labels for multiple propositions', () => {
      const result = annotator.annotate(s('It is raining and the streets are wet.'));
      const labels = result.features.propositions.map(p => p.label);
      expect(labels).toContain('p');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    test('proposition text is non-empty', () => {
      const result = annotator.annotate(s('All men are mortal.'));
      result.features.propositions.forEach(p => {
        expect(p.text.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('annotate() — mood', () => {
    test('reports declarative mood for standard sentence', () => {
      const result = annotator.annotate(s('The cat is on the mat.'));
      expect(result.features.mood).toBe('declarative');
    });
  });

  describe('annotateAll()', () => {
    test('returns one AnnotatedSentence per input', () => {
      const inputs = [s('All men are mortal.'), s('Socrates is a man.')];
      const result = annotator.annotateAll(inputs);
      expect(result).toHaveLength(2);
    });

    test('preserves source reference', () => {
      const input = s('All men are mortal.');
      const result = annotator.annotateAll([input]);
      expect(result[0].source).toBe(input);
    });
  });
});
