import { AlethicAssertoric } from '../../language/shared/types';
import {
  AnnotatedSentence,
  ConnectiveAnnotation,
  ModalAnnotation,
  MoodType,
  NegationAnnotation,
  PropositionAnnotation,
  QuantifierAnnotation,
  SentenceFeatures,
} from './nlpTypes';
import { NaturalLanguageSyntaxParser } from '../syntax/naturalLanguageSyntaxParser';

// ---------------------------------------------------------------------------
// Trigger tables
// ---------------------------------------------------------------------------

/** Each entry: [trigger text, formal operator].
 *  Sorted longest-first so longer phrases match before shorter prefixes. */
const CONNECTIVE_TRIGGERS: Array<[string, '&' | '|' | '->' | '<->']> = [
  ['if and only if', '<->'],
  ['iff', '<->'],
  ['just in case', '<->'],
  ['if … then', '->'],
  ['if...then', '->'],
  ['only if', '->'],
  ['implies', '->'],
  ['entails', '->'],
  ['if ', '->'],        // bare "if" — low specificity, kept last among ->
  ['then ', '->'],
  ['both … and', '&'],
  ['both ... and', '&'],
  ['furthermore', '&'],
  ['moreover', '&'],
  ['but', '&'],
  ['and', '&'],
  ['either … or', '|'],
  ['either ... or', '|'],
  ['unless', '|'],
  ['or', '|'],
];

const QUANTIFIER_TRIGGERS: Array<[string, '∀' | '∃' | '¬∃']> = [
  ['for all', '∀'],
  ['for every', '∀'],
  ['every', '∀'],
  ['each', '∀'],
  ['any ', '∀'],
  ['all ', '∀'],
  ['there exists', '∃'],
  ['there is a', '∃'],
  ['there are', '∃'],
  ['there is', '∃'],
  ['at least one', '∃'],
  ['some ', '∃'],
  ['no one', '¬∃'],
  ['nobody', '¬∃'],
  ['nothing', '¬∃'],
  ['none', '¬∃'],
  ['no ', '¬∃'],
  ['never', '¬∃'],
];

const MODAL_TRIGGERS: Array<[string, '□' | '◇']> = [
  ['it is necessary that', '□'],
  ['it is certain that', '□'],
  ['necessarily', '□'],
  ['certainly', '□'],
  ['must ', '□'],
  ['it is possible that', '◇'],
  ['it is conceivable that', '◇'],
  ['possibly', '◇'],
  ['perhaps', '◇'],
  ['maybe', '◇'],
  ['might ', '◇'],
  ['may ', '◇'],
  ['could ', '◇'],
];

const NEGATION_TRIGGERS: string[] = [
  'it is not the case that',
  'it is false that',
  'not',
  'never',
  'no ',
];

// ---------------------------------------------------------------------------
// Label generator
// ---------------------------------------------------------------------------

const PROP_LABELS = 'pqrstuvwxyz'.split('');

function labelFor(index: number): string {
  if (index < PROP_LABELS.length) return PROP_LABELS[index];
  // fallback: p0, p1, …
  return `p${index}`;
}

// ---------------------------------------------------------------------------
// Span search
// ---------------------------------------------------------------------------

/**
 * Find all non-overlapping occurrences of `trigger` in `text` (case-insensitive).
 * Returns an array of [start, end) spans.
 */
function findSpans(text: string, trigger: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const lower = text.toLowerCase();
  const tLower = trigger.toLowerCase();
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(tLower, pos);
    if (idx === -1) break;
    spans.push([idx, idx + trigger.length]);
    pos = idx + trigger.length;
  }
  return spans;
}

/**
 * Check whether `span` overlaps any span in `occupied`.
 */
function overlaps(span: [number, number], occupied: Array<[number, number]>): boolean {
  return occupied.some(([s, e]) => span[0] < e && span[1] > s);
}

// ---------------------------------------------------------------------------
// FormalAnnotator
// ---------------------------------------------------------------------------

/**
 * Extracts logical features (connectives, quantifiers, modal adverbs,
 * negations, atomic proposition candidates) from assertoric sentences.
 */
export class FormalAnnotator {

  private readonly _nlParser = new NaturalLanguageSyntaxParser();

  /**
   * Annotate a single assertoric sentence.
   *
   * @param sentence - The assertoric sentence to annotate.
   * @returns          An `AnnotatedSentence` with fully populated features and syntax tree.
   */
  annotate(sentence: AlethicAssertoric): AnnotatedSentence {
    const features   = this._extractFeatures(sentence.raw);
    const syntaxTree = this._nlParser.parse(sentence.raw);
    return { source: sentence, features, syntaxTree };
  }

  /**
   * Annotate a batch of assertoric sentences.
   *
   * @param sentences - The sentences to annotate.
   * @returns          An `AnnotatedSentence` for each input, in order.
   */
  annotateAll(sentences: AlethicAssertoric[]): AnnotatedSentence[] {
    return sentences.map(s => this.annotate(s));
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _extractFeatures(raw: string): SentenceFeatures {
    const occupied: Array<[number, number]> = [];

    const connectives = this._findConnectives(raw, occupied);
    const quantifiers = this._findQuantifiers(raw, occupied);
    const modalAdverbs = this._findModalAdverbs(raw, occupied);
    const negations   = this._findNegations(raw, occupied);
    const propositions = this._extractPropositions(raw, occupied);
    const mood = this._detectMood(raw);

    return { mood, connectives, quantifiers, modalAdverbs, negations, propositions };
  }

  private _detectMood(raw: string): MoodType {
    if (raw.trimEnd().endsWith('?')) return 'interrogative';
    if (raw.trimEnd().endsWith('!')) return 'exclamatory';
    const first = raw.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    const imperativeStarters = new Set([
      'go', 'stop', 'run', 'please', 'do', 'make', 'let', 'be', 'come',
      'take', 'get', 'give', 'look', 'show', 'tell', 'try', 'use', 'find',
      'put', 'keep', 'turn', 'open', 'close', 'start', 'wait', 'help', 'move',
    ]);
    if (imperativeStarters.has(first)) return 'imperative';
    return 'declarative';
  }

  private _findConnectives(
    raw: string,
    occupied: Array<[number, number]>,
  ): ConnectiveAnnotation[] {
    const results: ConnectiveAnnotation[] = [];
    for (const [trigger, operator] of CONNECTIVE_TRIGGERS) {
      for (const span of findSpans(raw, trigger)) {
        if (!overlaps(span, occupied)) {
          results.push({ text: raw.slice(span[0], span[1]), operator, span });
          occupied.push(span);
        }
      }
    }
    return results.sort((a, b) => a.span[0] - b.span[0]);
  }

  private _findQuantifiers(
    raw: string,
    occupied: Array<[number, number]>,
  ): QuantifierAnnotation[] {
    const results: QuantifierAnnotation[] = [];
    for (const [trigger, quantifier] of QUANTIFIER_TRIGGERS) {
      for (const span of findSpans(raw, trigger)) {
        if (!overlaps(span, occupied)) {
          results.push({ text: raw.slice(span[0], span[1]), quantifier, span });
          occupied.push(span);
        }
      }
    }
    return results.sort((a, b) => a.span[0] - b.span[0]);
  }

  private _findModalAdverbs(
    raw: string,
    occupied: Array<[number, number]>,
  ): ModalAnnotation[] {
    const results: ModalAnnotation[] = [];
    for (const [trigger, operator] of MODAL_TRIGGERS) {
      for (const span of findSpans(raw, trigger)) {
        if (!overlaps(span, occupied)) {
          results.push({ text: raw.slice(span[0], span[1]), operator, span });
          occupied.push(span);
        }
      }
    }
    return results.sort((a, b) => a.span[0] - b.span[0]);
  }

  private _findNegations(
    raw: string,
    occupied: Array<[number, number]>,
  ): NegationAnnotation[] {
    const results: NegationAnnotation[] = [];
    for (const trigger of NEGATION_TRIGGERS) {
      for (const span of findSpans(raw, trigger)) {
        if (!overlaps(span, occupied)) {
          results.push({ text: raw.slice(span[0], span[1]), span });
          occupied.push(span);
        }
      }
    }
    return results.sort((a, b) => a.span[0] - b.span[0]);
  }

  /**
   * Extract atomic proposition candidates — the maximal text spans that remain
   * after all detected logical markers have been removed.
   *
   * The occupied array contains the spans of all already-detected markers.
   * We invert it to find the "free" text spans, then trim and discard blanks.
   */
  private _extractPropositions(
    raw: string,
    occupied: Array<[number, number]>,
  ): PropositionAnnotation[] {
    // Sort occupied spans by start position
    const sorted = [...occupied].sort((a, b) => a[0] - b[0]);

    // Compute free spans (gaps between occupied spans)
    const free: Array<[number, number]> = [];
    let cursor = 0;
    for (const [s, e] of sorted) {
      if (cursor < s) free.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (cursor < raw.length) free.push([cursor, raw.length]);

    // Build PropositionAnnotation for each non-trivial free span
    const props: PropositionAnnotation[] = [];
    let labelIndex = 0;
    for (const [s, e] of free) {
      const text = raw.slice(s, e).replace(/[,;:.!?"'()\[\]{}]/g, '').trim();
      if (text.length < 2) continue;
      props.push({
        text,
        label: labelFor(labelIndex++),
        span: [s, e],
      });
    }
    return props;
  }
}
