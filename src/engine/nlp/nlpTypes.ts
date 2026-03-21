/**
 * Types for the Natural Language Processing engine.
 *
 * The NLP engine is responsible for parsing arbitrary input strings and
 * identifying candidates that are alethic assertoric sentences — declarative
 * statements that make a truth claim and can be passed on to a formal
 * language parsing engine (propositional, quantificational, etc.).
 *
 * An alethic assertoric sentence:
 *   - Makes a claim about what is (necessarily/possibly) true
 *   - Is declarative in mood (not a question, command, or exclamation)
 *   - Has a determinate truth value (or truth condition)
 */

export interface AlethicAssertoric {
  /** The raw sentence string extracted from the input. */
  raw: string;
  /** Confidence score (0–1) that this sentence is a valid assertoric candidate. */
  confidence: number;
}

export interface NLPResult {
  /** The original input string. */
  input: string;
  /** Zero or more assertoric sentence candidates found in the input. */
  candidates: AlethicAssertoric[];
}
