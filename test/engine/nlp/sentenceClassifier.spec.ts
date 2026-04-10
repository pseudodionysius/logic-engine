import { SentenceClassifier } from '../../../src/engine/nlp/sentenceClassifier';

describe('SentenceClassifier', () => {
  let clf: SentenceClassifier;

  beforeEach(() => { clf = new SentenceClassifier(); });

  describe('classify() — mood filtering', () => {
    test('returns null for interrogative sentence (ends with ?)', () => {
      expect(clf.classify('Is it raining?')).toBeNull();
    });

    test('returns null for exclamatory sentence (ends with !)', () => {
      expect(clf.classify('It is raining!')).toBeNull();
    });

    test('returns null for imperative sentence (starts with Go)', () => {
      expect(clf.classify('Go to the store.')).toBeNull();
    });

    test('returns null for imperative sentence (starts with Stop)', () => {
      expect(clf.classify('Stop doing that.')).toBeNull();
    });

    test('returns AlethicAssertoric for a declarative sentence', () => {
      const result = clf.classify('The cat is on the mat.');
      expect(result).not.toBeNull();
      expect(result!.raw).toBe('The cat is on the mat.');
    });

    test('raw field matches the original sentence string', () => {
      const sentence = 'All men are mortal.';
      const result = clf.classify(sentence);
      expect(result!.raw).toBe(sentence);
    });
  });

  describe('classify() — confidence scoring', () => {
    test('confidence is between 0.05 and 1.0', () => {
      const result = clf.classify('The cat is on the mat.');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.05);
      expect(result!.confidence).toBeLessThanOrEqual(1.0);
    });

    test('sentence with copula scores higher than base', () => {
      const withCopula = clf.classify('The cat is on the mat.');
      const base = clf.classify('Logic matters greatly here somehow.');
      expect(withCopula!.confidence).toBeGreaterThan(base!.confidence);
    });

    test('sentence with epistemic marker scores higher', () => {
      const epistemic = clf.classify('It is necessarily true that all bachelors are unmarried.');
      const plain = clf.classify('The cat sat on the mat somewhere.');
      expect(epistemic!.confidence).toBeGreaterThan(plain!.confidence);
    });

    test('sentence with hedging language scores lower', () => {
      const hedged = clf.classify('Maybe the cat is on the mat.');
      const plain = clf.classify('The cat is on the mat.');
      expect(hedged!.confidence).toBeLessThan(plain!.confidence);
    });

    test('very short sentence (< 4 words) scores lower', () => {
      // "Rain falls." — 2 words, no copula, no subject-verb match → base 0.5 − 0.10 = 0.40
      // long sentence with copula → 0.5 + 0.15 = 0.65
      const short = clf.classify('Rain falls.');
      const long = clf.classify('The study of formal logic is essential for rigorous reasoning.');
      expect(short!.confidence).toBeLessThan(long!.confidence);
    });
  });

  describe('classifyAll()', () => {
    test('drops non-assertoric sentences', () => {
      const input = [
        'All men are mortal.',
        'Is Socrates mortal?',
        'Socrates is a man.',
        'Stop philosophising.',
      ];
      const result = clf.classifyAll(input);
      expect(result).toHaveLength(2);
      expect(result[0].raw).toBe('All men are mortal.');
      expect(result[1].raw).toBe('Socrates is a man.');
    });

    test('returns empty array when all sentences are non-assertoric', () => {
      expect(clf.classifyAll(['Is it raining?', 'Go home!'])).toEqual([]);
    });

    test('preserves order of assertoric sentences', () => {
      const input = ['First sentence.', 'Second sentence.', 'Third sentence.'];
      const result = clf.classifyAll(input);
      expect(result.map(r => r.raw)).toEqual(input);
    });
  });
});
