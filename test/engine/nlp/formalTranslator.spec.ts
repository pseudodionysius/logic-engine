import { FormalAnnotator } from '../../../src/engine/nlp/formalAnnotator';
import { FormalTranslator } from '../../../src/engine/nlp/formalTranslator';
import { AlethicAssertoric, SentenceSet } from '../../../src/language/shared/types';

function s(raw: string): AlethicAssertoric {
  return { raw, confidence: 1.0 };
}

function makeSet(...raws: string[]): SentenceSet {
  return { sentences: raws.map(s) };
}

describe('FormalTranslator', () => {
  let annotator: FormalAnnotator;
  let translator: FormalTranslator;

  beforeEach(() => {
    annotator = new FormalAnnotator();
    translator = new FormalTranslator();
  });

  function translate(sentences: AlethicAssertoric[]) {
    const set: SentenceSet = { sentences };
    const annotated = annotator.annotateAll(sentences);
    return translator.translate(set, annotated);
  }

  describe('translate() — structure', () => {
    test('returns source SentenceSet unchanged', () => {
      const set = makeSet('Socrates is a man.');
      const annotated = annotator.annotateAll(set.sentences);
      const result = translator.translate(set, annotated);
      expect(result.source).toBe(set);
    });

    test('propositional.sentences has one entry per input sentence', () => {
      const result = translate([s('All men are mortal.'), s('Socrates is a man.')]);
      expect(result.propositional.sentences).toHaveLength(2);
    });

    test('quantificational.sentences has one entry per input sentence', () => {
      const result = translate([s('All men are mortal.'), s('Socrates is a man.')]);
      expect(result.quantificational.sentences).toHaveLength(2);
    });

    test('modal.sentences has one entry per input sentence', () => {
      const result = translate([s('Necessarily all bachelors are unmarried.')]);
      expect(result.modal.sentences).toHaveLength(1);
    });
  });

  describe('translate() — propositional formulaString', () => {
    test('simple sentence with no connective → single atom label', () => {
      const result = translate([s('Socrates is a man.')]);
      const f = result.propositional.sentences[0].formulaString;
      expect(f).toMatch(/^~?[p-z](\d+)?$/);
    });

    test('sentence with "and" connective → formula contains &', () => {
      const result = translate([s('It is raining and the streets are wet.')]);
      const f = result.propositional.sentences[0].formulaString;
      expect(f).toContain('&');
    });

    test('sentence with "if … then" connective → formula contains ->', () => {
      const result = translate([s('If it is raining then the streets are wet.')]);
      const f = result.propositional.sentences[0].formulaString;
      expect(f).toContain('->');
    });

    test('sentence with "if and only if" → formula contains <->', () => {
      const result = translate([s('P holds if and only if Q holds.')]);
      const f = result.propositional.sentences[0].formulaString;
      expect(f).toContain('<->');
    });

    test('propositionMap maps labels to non-empty text fragments', () => {
      const result = translate([s('Socrates is a man.')]);
      const map = result.propositional.sentences[0].propositionMap;
      Object.values(map).forEach(text => {
        expect(text.trim().length).toBeGreaterThan(0);
      });
    });

    test('source field references the original AlethicAssertoric', () => {
      const input = s('Socrates is a man.');
      const result = translate([input]);
      expect(result.propositional.sentences[0].source).toBe(input);
    });
  });

  describe('translate() — quantificational', () => {
    test('sentence with "all" gets ∀x quantifier prefix', () => {
      const result = translate([s('All men are mortal.')]);
      const t = result.quantificational.sentences[0];
      expect(t.quantifierPrefix).toBe('∀x');
    });

    test('sentence with "some" gets ∃x quantifier prefix', () => {
      const result = translate([s('Some philosophers are logicians.')]);
      const t = result.quantificational.sentences[0];
      expect(t.quantifierPrefix).toBe('∃x');
    });

    test('sentence with "no" gets ¬∃x quantifier prefix', () => {
      const result = translate([s('No mortal is immortal.')]);
      const t = result.quantificational.sentences[0];
      expect(t.quantifierPrefix).toBe('¬∃x');
    });

    test('sentence without quantifier has null quantifierPrefix', () => {
      const result = translate([s('Socrates is a man.')]);
      expect(result.quantificational.sentences[0].quantifierPrefix).toBeNull();
    });

    test('formulaString includes the quantifier prefix', () => {
      const result = translate([s('All men are mortal.')]);
      const f = result.quantificational.sentences[0].formulaString;
      expect(f).toContain('∀x');
    });

    test('suggestedPredicate is a non-empty capitalised string when proposition exists', () => {
      const result = translate([s('All men are mortal.')]);
      const pred = result.quantificational.sentences[0].suggestedPredicate;
      if (pred !== null) {
        expect(pred.length).toBeGreaterThan(0);
        expect(pred[0]).toBe(pred[0].toUpperCase());
      }
    });
  });

  describe('translate() — modal', () => {
    test('sentence with "necessarily" gets □ modal prefix', () => {
      const result = translate([s('Necessarily all bachelors are unmarried.')]);
      const t = result.modal.sentences[0];
      expect(t.modalPrefix).toBe('□');
    });

    test('sentence with "possibly" gets ◇ modal prefix', () => {
      const result = translate([s('Possibly the theorem is unprovable.')]);
      const t = result.modal.sentences[0];
      expect(t.modalPrefix).toBe('◇');
    });

    test('sentence without modal adverb has null modalPrefix', () => {
      const result = translate([s('Socrates is a man.')]);
      expect(result.modal.sentences[0].modalPrefix).toBeNull();
    });

    test('formulaString wraps atom in □(…) when modal prefix present', () => {
      const result = translate([s('Necessarily p is true.')]);
      const f = result.modal.sentences[0].formulaString;
      expect(f).toMatch(/^□\(/);
    });
  });
});
