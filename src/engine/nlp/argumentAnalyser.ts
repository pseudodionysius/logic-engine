import { AlethicAssertoric } from '../../language/shared/types';
import { AnalysedArgument, ArgumentRelation, SentencePair } from './nlpTypes';

// ---------------------------------------------------------------------------
// Discourse markers
// ---------------------------------------------------------------------------

const CONCLUSION_MARKERS = [
  'therefore', 'thus', 'hence', 'consequently', 'it follows that',
  'we can conclude', 'this means', 'in conclusion', 'as a result',
  'so,', 'so ', 'which shows', 'which proves', 'which means',
  'this demonstrates', 'this establishes',
];

const PREMISE_MARKERS = [
  'because', 'since', 'given that', 'assuming', 'as we know',
  'it is known that', 'suppose', 'if we assume', 'we know that',
  'it has been shown that', 'the evidence shows', 'we observe that',
  'for the reason that', 'in view of the fact that',
];

// Negation words used when detecting opposing relations between sentences
const NEGATION_WORDS = ['not', 'never', 'no ', "isn't", "aren't", "wasn't",
  "weren't", "doesn't", "don't", "didn't", 'neither', 'nor'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startsWithMarker(text: string, markers: string[]): boolean {
  const lower = text.toLowerCase().trimStart();
  return markers.some(m => lower.startsWith(m));
}

function containsMarker(text: string, markers: string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some(m => lower.includes(m));
}

/**
 * Extract the key content words from a sentence for overlap comparison.
 * Strips stop-words and returns the remaining lowercase tokens.
 */
function contentWords(text: string): Set<string> {
  const STOP = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'and', 'or', 'but', 'if', 'then', 'so', 'that', 'this',
    'it', 'its', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'not', 'no', 'nor', 'yet', 'both', 'either',
    'neither', 'also', 'therefore', 'thus', 'hence', 'since',
    'because', 'although', 'though', 'however', 'moreover',
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w)),
  );
}

/**
 * Detect whether sentence A appears to oppose sentence B:
 * - B contains a negation of a key content word from A, or vice-versa.
 */
function detectOpposition(a: AlethicAssertoric, b: AlethicAssertoric): boolean {
  const aWords = contentWords(a.raw);
  const bWords = contentWords(b.raw);

  // Any key word overlap with a negation in the other sentence
  const overlap = [...aWords].some(w => bWords.has(w));
  if (!overlap) return false;

  const aNegated = NEGATION_WORDS.some(n => a.raw.toLowerCase().includes(n));
  const bNegated = NEGATION_WORDS.some(n => b.raw.toLowerCase().includes(n));

  // One negated, one not — with shared content words → opposition
  return aNegated !== bNegated;
}

// ---------------------------------------------------------------------------
// ArgumentAnalyser
// ---------------------------------------------------------------------------

/**
 * Detects argument structure within a set of assertoric sentences.
 *
 * Identifies which sentences play the role of premises and which conclusions,
 * and records pairwise support/oppose/independent relations.
 */
export class ArgumentAnalyser {

  /**
   * Analyse the argument structure of an ordered set of assertoric sentences.
   *
   * @param sentences - The assertoric candidates to analyse.
   * @returns          A fully populated `AnalysedArgument`.
   */
  analyse(sentences: AlethicAssertoric[]): AnalysedArgument {
    const conclusions: AlethicAssertoric[] = [];
    const premises: AlethicAssertoric[] = [];

    for (const s of sentences) {
      if (startsWithMarker(s.raw, CONCLUSION_MARKERS) ||
          containsMarker(s.raw, CONCLUSION_MARKERS.filter(m => m.length > 8))) {
        conclusions.push(s);
      } else if (startsWithMarker(s.raw, PREMISE_MARKERS) ||
                 containsMarker(s.raw, PREMISE_MARKERS.filter(m => m.length > 8))) {
        premises.push(s);
      } else {
        // No explicit marker — treat as a premise by default
        premises.push(s);
      }
    }

    // If everything was classified as a premise (no conclusions found),
    // treat the last sentence as the conclusion — the most common pattern
    // in natural argument text.
    if (conclusions.length === 0 && premises.length >= 1) {
      const last = premises.pop()!;
      conclusions.push(last);
    }

    const relations = this._computeRelations(sentences);

    return { sentences, premises, conclusions, relations };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _computeRelations(sentences: AlethicAssertoric[]): SentencePair[] {
    const pairs: SentencePair[] = [];

    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const a = sentences[i];
        const b = sentences[j];
        const relation: ArgumentRelation = detectOpposition(a, b)
          ? 'opposes'
          : this._detectSupport(a, b)
            ? 'supports'
            : 'independent';
        pairs.push({ from: a, to: b, relation });
      }
    }

    return pairs;
  }

  private _detectSupport(a: AlethicAssertoric, b: AlethicAssertoric): boolean {
    // A supports B if B begins with a conclusion marker AND A and B share
    // content words, OR if A begins with a premise marker.
    if (startsWithMarker(a.raw, PREMISE_MARKERS)) return true;
    if (startsWithMarker(b.raw, CONCLUSION_MARKERS)) {
      const aWords = contentWords(a.raw);
      const bWords = contentWords(b.raw);
      return [...aWords].some(w => bWords.has(w));
    }
    return false;
  }
}
