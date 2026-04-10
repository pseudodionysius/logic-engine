import { AlethicAssertoric } from '../../language/shared/types';
import { MoodType } from './nlpTypes';

// ---------------------------------------------------------------------------
// Imperative verb starters — sentences beginning with these words are treated
// as commands and excluded from the assertoric candidate set.
// ---------------------------------------------------------------------------
const IMPERATIVE_STARTERS = new Set([
  'go', 'stop', 'run', 'please', 'do', "don't", 'make', 'let', 'be',
  'come', 'take', 'get', 'give', 'look', 'show', 'tell', 'try', 'use',
  'find', 'put', 'keep', 'turn', 'open', 'close', 'start', 'wait',
  'help', 'move', 'consider', 'note', 'remember', 'imagine', 'suppose',
  'assume', 'define', 'write', 'read', 'listen', 'watch',
]);

// ---------------------------------------------------------------------------
// Confidence signal patterns
// ---------------------------------------------------------------------------

const COPULA_RE =
  /\b(is|are|was|were|will be|has been|have been|had been)\b/i;

const EPISTEMIC_MARKER_RE =
  /\b(necessarily|must|certainly|it is certain|it is a fact|it is clear)\b/i;

const HEDGING_RE =
  /\b(maybe|perhaps|i think|i believe|probably|i suppose|i guess|seemingly|apparently)\b/i;

const IT_IS_THERE_RE = /^(it is|there is|there are)\b/i;

// A rough subject-verb check: starts with a capitalised noun phrase then a verb
const SUBJ_VERB_RE = /^[A-Z][a-z]+\s+(?:\w+\s+)?(is|are|was|were|has|have|had|will|can|could|should|would|does|did|makes|takes|gives|shows|proves|implies|entails|follows)\b/;

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classifies a sentence string as alethic assertoric or not, and scores
 * its confidence.
 *
 * All classification is rule-based — no external dependencies.
 */
export class SentenceClassifier {

  /**
   * Attempt to classify a single sentence string.
   *
   * @param sentence - The trimmed sentence string to classify.
   * @returns An `AlethicAssertoric` if the sentence is assertoric, or `null`
   *          if it is interrogative, imperative, or exclamatory.
   */
  classify(sentence: string): AlethicAssertoric | null {
    const mood = this._detectMood(sentence);
    if (mood !== 'declarative') return null;

    const confidence = this._scoreConfidence(sentence);
    return { raw: sentence, confidence };
  }

  /**
   * Classify a batch of sentence strings, discarding non-assertoric ones.
   *
   * @param sentences - The sentence strings to classify.
   * @returns          Only the assertoric candidates, in input order.
   */
  classifyAll(sentences: string[]): AlethicAssertoric[] {
    const results: AlethicAssertoric[] = [];
    for (const s of sentences) {
      const r = this.classify(s);
      if (r !== null) results.push(r);
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _detectMood(sentence: string): MoodType {
    const trimmed = sentence.trim();

    if (trimmed.endsWith('?')) return 'interrogative';
    if (trimmed.endsWith('!')) return 'exclamatory';

    // Imperative: first word (lowercased) is a known imperative starter
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
    if (IMPERATIVE_STARTERS.has(firstWord)) return 'imperative';

    return 'declarative';
  }

  private _scoreConfidence(sentence: string): number {
    let score = 0.5;

    if (COPULA_RE.test(sentence)) score += 0.15;
    if (EPISTEMIC_MARKER_RE.test(sentence)) score += 0.15;
    if (HEDGING_RE.test(sentence)) score -= 0.15;
    if (IT_IS_THERE_RE.test(sentence)) score += 0.10;
    if (SUBJ_VERB_RE.test(sentence)) score += 0.10;

    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount < 4) score -= 0.10;

    // Clamp to [0.05, 1.0]
    return Math.min(1.0, Math.max(0.05, score));
  }
}
