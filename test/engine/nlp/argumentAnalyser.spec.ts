import { ArgumentAnalyser } from '../../../src/engine/nlp/argumentAnalyser';
import { AlethicAssertoric } from '../../../src/language/shared/types';

function s(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

describe('ArgumentAnalyser', () => {
  let analyser: ArgumentAnalyser;

  beforeEach(() => { analyser = new ArgumentAnalyser(); });

  describe('analyse() — structural identification', () => {
    test('returns all input sentences in the sentences field', () => {
      const inputs = [s('All men are mortal.'), s('Socrates is a man.'), s('Therefore Socrates is mortal.')];
      const result = analyser.analyse(inputs);
      expect(result.sentences).toHaveLength(3);
    });

    test('identifies a sentence starting with "therefore" as a conclusion', () => {
      const inputs = [
        s('All men are mortal.'),
        s('Socrates is a man.'),
        s('Therefore Socrates is mortal.'),
      ];
      const result = analyser.analyse(inputs);
      expect(result.conclusions.some(c => c.raw.startsWith('Therefore'))).toBe(true);
    });

    test('identifies a sentence starting with "thus" as a conclusion', () => {
      const inputs = [s('All bachelors are unmarried.'), s('Thus John is unmarried.')];
      const result = analyser.analyse(inputs);
      expect(result.conclusions.some(c => c.raw.startsWith('Thus'))).toBe(true);
    });

    test('identifies a sentence starting with "hence" as a conclusion', () => {
      const inputs = [s('The premises hold.'), s('Hence the conclusion follows.')];
      const result = analyser.analyse(inputs);
      expect(result.conclusions.some(c => c.raw.startsWith('Hence'))).toBe(true);
    });

    test('treats non-marked sentences as premises', () => {
      const inputs = [s('All men are mortal.'), s('Socrates is a man.'), s('Therefore Socrates is mortal.')];
      const result = analyser.analyse(inputs);
      expect(result.premises.some(p => p.raw === 'All men are mortal.')).toBe(true);
      expect(result.premises.some(p => p.raw === 'Socrates is a man.')).toBe(true);
    });

    test('when no conclusion marker found, treats last sentence as conclusion', () => {
      const inputs = [s('P is true.'), s('Q is true.'), s('R is true.')];
      const result = analyser.analyse(inputs);
      expect(result.conclusions).toHaveLength(1);
      expect(result.conclusions[0].raw).toBe('R is true.');
    });

    test('single sentence returns one conclusion and no premises', () => {
      const result = analyser.analyse([s('It is raining.')]);
      expect(result.conclusions).toHaveLength(1);
      expect(result.premises).toHaveLength(0);
    });

    test('returns empty arrays for empty input', () => {
      const result = analyser.analyse([]);
      expect(result.sentences).toEqual([]);
      expect(result.premises).toEqual([]);
      expect(result.conclusions).toEqual([]);
      expect(result.relations).toEqual([]);
    });
  });

  describe('analyse() — pairwise relations', () => {
    test('produces n*(n-1)/2 pairs for n sentences', () => {
      const inputs = [s('A is true.'), s('B is true.'), s('C is true.')];
      const result = analyser.analyse(inputs);
      expect(result.relations).toHaveLength(3);
    });

    test('detects opposition when one sentence negates key word of another', () => {
      const inputs = [
        s('The cat is on the mat.'),
        s('The cat is not on the mat.'),
      ];
      const result = analyser.analyse(inputs);
      const pair = result.relations[0];
      expect(pair.relation).toBe('opposes');
    });

    test('detects support when sentence begins with a premise marker', () => {
      const inputs = [
        s('Since all men are mortal, we should accept it.'),
        s('Therefore John is mortal.'),
      ];
      const result = analyser.analyse(inputs);
      const pair = result.relations[0];
      expect(pair.relation).toBe('supports');
    });

    test('marks independent relation when no structural link detected', () => {
      const inputs = [
        s('The sky is blue.'),
        s('Mathematics is abstract.'),
      ];
      const result = analyser.analyse(inputs);
      expect(result.relations[0].relation).toBe('independent');
    });

    test('from/to fields reference the correct sentences', () => {
      const a = s('First sentence.');
      const b = s('Second sentence.');
      const result = analyser.analyse([a, b]);
      expect(result.relations[0].from).toBe(a);
      expect(result.relations[0].to).toBe(b);
    });
  });
});
