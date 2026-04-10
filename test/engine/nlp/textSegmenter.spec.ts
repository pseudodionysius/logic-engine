import { TextSegmenter } from '../../../src/engine/nlp/textSegmenter';

describe('TextSegmenter', () => {
  let seg: TextSegmenter;

  beforeEach(() => { seg = new TextSegmenter(); });

  describe('segment()', () => {
    test('splits a single sentence ending with a period', () => {
      expect(seg.segment('The cat is on the mat.')).toEqual(['The cat is on the mat.']);
    });

    test('splits two sentences separated by a period and space', () => {
      const result = seg.segment('The cat is on the mat. The dog is in the garden.');
      expect(result).toEqual([
        'The cat is on the mat.',
        'The dog is in the garden.',
      ]);
    });

    test('splits on question mark', () => {
      const result = seg.segment('Is it raining? The streets are wet.');
      expect(result).toEqual(['Is it raining?', 'The streets are wet.']);
    });

    test('splits on exclamation mark', () => {
      const result = seg.segment('It is raining! The streets are wet.');
      expect(result).toEqual(['It is raining!', 'The streets are wet.']);
    });

    test('splits on double newline (paragraph break)', () => {
      const result = seg.segment('First sentence.\n\nSecond sentence.');
      expect(result).toEqual(['First sentence.', 'Second sentence.']);
    });

    test('does not split on Mr. abbreviation', () => {
      const result = seg.segment('Mr. Smith is a philosopher. He studies logic.');
      expect(result).toEqual([
        'Mr. Smith is a philosopher.',
        'He studies logic.',
      ]);
    });

    test('does not split on Dr. abbreviation', () => {
      const result = seg.segment('Dr. Jones proved the theorem. It was elegant.');
      expect(result).toEqual([
        'Dr. Jones proved the theorem.',
        'It was elegant.',
      ]);
    });

    test('does not split on decimal numbers', () => {
      const result = seg.segment('The value is 3.14. This is pi.');
      expect(result).toEqual(['The value is 3.14.', 'This is pi.']);
    });

    test('handles multiple sentences correctly', () => {
      const text = 'All men are mortal. Socrates is a man. Therefore Socrates is mortal.';
      const result = seg.segment(text);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('All men are mortal.');
      expect(result[1]).toBe('Socrates is a man.');
      expect(result[2]).toBe('Therefore Socrates is mortal.');
    });

    test('trims whitespace from segments', () => {
      const result = seg.segment('  First sentence.  Second sentence.  ');
      expect(result[0]).toBe('First sentence.');
      expect(result[1]).toBe('Second sentence.');
    });

    test('discards blank segments', () => {
      const result = seg.segment('\n\n\n');
      expect(result).toEqual([]);
    });

    test('handles single word input', () => {
      const result = seg.segment('Logic');
      expect(result).toEqual(['Logic']);
    });
  });

  describe('segmentStream()', () => {
    async function* makeStream(chunks: string[]): AsyncIterable<string> {
      for (const chunk of chunks) yield chunk;
    }

    test('collects chunks and segments correctly', async () => {
      const stream = makeStream(['All men are mortal. ', 'Socrates is a man.']);
      const result = await seg.segmentStream(stream);
      expect(result).toEqual([
        'All men are mortal.',
        'Socrates is a man.',
      ]);
    });

    test('handles single-chunk stream', async () => {
      const stream = makeStream(['It is raining.']);
      const result = await seg.segmentStream(stream);
      expect(result).toEqual(['It is raining.']);
    });

    test('handles empty stream', async () => {
      const stream = makeStream([]);
      const result = await seg.segmentStream(stream);
      expect(result).toEqual([]);
    });
  });
});
