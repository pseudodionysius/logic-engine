import { NLPEngine } from '../../../src/engine/nlp/nlpEngine';

describe('NLPEngine', () => {
  let engine: NLPEngine;

  beforeEach(() => { engine = new NLPEngine(); });

  describe('parse() — basic pipeline', () => {
    test('returns the original input string', () => {
      const result = engine.parse('The cat is on the mat.');
      expect(result.input).toBe('The cat is on the mat.');
    });

    test('identifies an alethic assertoric candidate from a declarative sentence', () => {
      const result = engine.parse('All men are mortal.');
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].raw).toBe('All men are mortal.');
    });

    test('returns empty candidates for a question', () => {
      const result = engine.parse('Is it raining?');
      expect(result.candidates).toHaveLength(0);
    });

    test('returns empty candidates for an imperative', () => {
      const result = engine.parse('Go to the store.');
      expect(result.candidates).toHaveLength(0);
    });

    test('sentenceSet.sentences equals candidates', () => {
      const result = engine.parse('All men are mortal.');
      expect(result.sentenceSet.sentences).toEqual(result.candidates);
    });

    test('annotated has one entry per candidate', () => {
      const result = engine.parse('All men are mortal. Socrates is a man.');
      expect(result.annotated).toHaveLength(result.candidates.length);
    });
  });

  describe('parse() — multi-sentence input', () => {
    test('segments and classifies multiple sentences', () => {
      const text = 'All men are mortal. Socrates is a man. Therefore Socrates is mortal.';
      const result = engine.parse(text);
      expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    });

    test('drops interrogative from multi-sentence input', () => {
      const text = 'All men are mortal. Is Socrates a man? Socrates is indeed a man.';
      const result = engine.parse(text);
      const raws = result.candidates.map(c => c.raw);
      expect(raws.some(r => r.includes('?'))).toBe(false);
    });
  });

  describe('parse() — argument structure', () => {
    test('argument.sentences references the same objects as candidates', () => {
      const result = engine.parse('All men are mortal. Socrates is a man. Therefore Socrates is mortal.');
      result.argument.sentences.forEach(s => {
        expect(result.candidates).toContain(s);
      });
    });

    test('argument identifies at least one conclusion in syllogism', () => {
      const text = 'All men are mortal. Socrates is a man. Therefore Socrates is mortal.';
      const result = engine.parse(text);
      expect(result.argument.conclusions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parse() — translations', () => {
    test('translations.source equals sentenceSet', () => {
      const result = engine.parse('All men are mortal.');
      expect(result.translations.source).toBe(result.sentenceSet);
    });

    test('propositional translation has one sentence per candidate', () => {
      const result = engine.parse('All men are mortal. Socrates is a man.');
      expect(result.translations.propositional.sentences).toHaveLength(result.candidates.length);
    });

    test('quantificational translation detects universal quantifier', () => {
      const result = engine.parse('All men are mortal.');
      const qt = result.translations.quantificational.sentences[0];
      expect(qt.quantifierPrefix).toBe('∀x');
    });

    test('modal translation detects necessity operator', () => {
      const result = engine.parse('Necessarily all bachelors are unmarried.');
      const mt = result.translations.modal.sentences[0];
      expect(mt.modalPrefix).toBe('□');
    });

    test('propositional formula string is non-empty', () => {
      const result = engine.parse('Socrates is a man.');
      const f = result.translations.propositional.sentences[0].formulaString;
      expect(f.trim().length).toBeGreaterThan(0);
    });
  });

  describe('parseStream()', () => {
    async function* makeStream(chunks: string[]): AsyncIterable<string> {
      for (const chunk of chunks) yield chunk;
    }

    test('produces same result as parse() for the same text', async () => {
      const text = 'All men are mortal. Socrates is a man.';
      const parseResult = engine.parse(text);
      const streamResult = await engine.parseStream(makeStream([text]));
      expect(streamResult.candidates.map(c => c.raw))
        .toEqual(parseResult.candidates.map(c => c.raw));
    });

    test('handles chunked input correctly', async () => {
      const stream = makeStream(['All men are mortal.', ' Socrates is a man.']);
      const result = await engine.parseStream(stream);
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    });

    test('returns empty candidates for empty stream', async () => {
      const result = await engine.parseStream(makeStream([]));
      expect(result.candidates).toHaveLength(0);
    });

    test('result contains translations', async () => {
      const stream = makeStream(['All men are mortal.']);
      const result = await engine.parseStream(stream);
      expect(result.translations).toBeDefined();
      expect(result.translations.propositional.sentences).toHaveLength(
        result.candidates.length,
      );
    });
  });

  describe('parse() — confidence scoring', () => {
    test('all candidates have confidence between 0 and 1', () => {
      const result = engine.parse('The cat is on the mat. Socrates is a philosopher.');
      result.candidates.forEach(c => {
        expect(c.confidence).toBeGreaterThanOrEqual(0);
        expect(c.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});
