/**
 * TextSegmenter — splits raw text into sentence-candidate strings.
 *
 * Uses a regex-based boundary detector that respects common abbreviations
 * and decimal numbers. Supports both eager (string) and lazy (AsyncIterable)
 * input.
 */

/** Known abbreviations that contain a dot but do not end a sentence. */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc',
  'e.g', 'i.e', 'approx', 'dept', 'est', 'govt', 'inc', 'ltd', 'jan',
  'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]);

/**
 * Return true if the word immediately before the dot is a known abbreviation
 * or a single capital letter (initials).
 */
function isAbbreviation(text: string, dotIndex: number): boolean {
  // grab the word before the dot
  const before = text.slice(0, dotIndex).trimEnd();
  const match = before.match(/([A-Za-z.]+)$/);
  if (!match) return false;
  const word = match[1].toLowerCase();
  if (ABBREVIATIONS.has(word)) return true;
  // single letter — likely an initial
  if (/^[a-z]$/.test(word)) return true;
  return false;
}

/**
 * Return true if the dot is part of a decimal number (e.g. "3.14").
 */
function isDecimal(text: string, dotIndex: number): boolean {
  const charBefore = text[dotIndex - 1];
  const charAfter = text[dotIndex + 1];
  return /\d/.test(charBefore) && /\d/.test(charAfter ?? '');
}

/**
 * Split a single contiguous text block into sentence strings.
 * Each returned string is trimmed and non-empty.
 */
function splitBlock(text: string): string[] {
  const results: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '?' || ch === '!') {
      // These always end a sentence (peek ahead for whitespace)
      const segment = text.slice(start, i + 1).trim();
      if (segment.length > 0) results.push(segment);
      start = i + 1;
      // skip any trailing whitespace so next segment starts cleanly
      while (start < text.length && /\s/.test(text[start])) start++;
      i = start - 1;
      continue;
    }

    if (ch === '.') {
      if (isDecimal(text, i)) continue;
      if (isAbbreviation(text, i)) continue;

      // Check what follows: must be whitespace then an uppercase letter
      // or end of string
      const rest = text.slice(i + 1);
      const followMatch = rest.match(/^(\s+)([A-Z"']|$)/);
      if (followMatch) {
        const segment = text.slice(start, i + 1).trim();
        if (segment.length > 0) results.push(segment);
        start = i + 1 + followMatch[1].length;
        i = start - 1;
      }
    }
  }

  // Remaining text after last boundary
  const tail = text.slice(start).trim();
  if (tail.length > 0) results.push(tail);

  return results;
}

export class TextSegmenter {

  /**
   * Split a raw text string into sentence-candidate strings.
   *
   * Paragraph breaks (double newlines) are always treated as sentence
   * boundaries. Within each paragraph, boundary detection uses punctuation
   * heuristics that respect abbreviations and decimal numbers.
   *
   * @param text - The raw input text.
   * @returns    An array of trimmed, non-empty sentence strings.
   */
  segment(text: string): string[] {
    // Split on paragraph breaks first, then apply per-block splitting
    const paragraphs = text.split(/\n\s*\n/);
    const sentences: string[] = [];
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length === 0) continue;
      for (const sent of splitBlock(trimmed)) {
        sentences.push(sent);
      }
    }
    return sentences;
  }

  /**
   * Asynchronously collect chunks from an AsyncIterable source and segment them.
   *
   * Works with any source that produces string chunks: Node.js ReadableStream
   * (in object mode or piped through a text decoder), web ReadableStream readers,
   * or any other async iterator of strings.
   *
   * @param source - An async iterable yielding string chunks.
   * @returns      A promise resolving to an array of sentence strings.
   */
  async segmentStream(source: AsyncIterable<string>): Promise<string[]> {
    let buffer = '';
    for await (const chunk of source) {
      buffer += chunk;
    }
    return this.segment(buffer);
  }
}
