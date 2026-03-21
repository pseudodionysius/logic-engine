/**
 * Shared base types across all formal logical languages supported by this engine.
 */

/**
 * The root evaluation contract for any well-formed expression in any supported
 * formal language. All language-specific formula types must satisfy this interface.
 */
export interface Formula {
  value: () => boolean;
}

/**
 * A validated alethic assertoric sentence — a declarative, truth-apt statement
 * that makes a claim about what is (necessarily/possibly) true.
 *
 * This is the universal input type for all formal language engines:
 *   - Produced by NLPEngine.parse() with a confidence score from 0–1
 *   - Constructed manually by setting confidence = 1.0
 *   - Consumed by formal language parsers (propositional, quantificational, etc.)
 *
 * An alethic assertoric sentence:
 *   - Is declarative in mood (not a question, command, or exclamation)
 *   - Makes a truth claim that has a determinate truth value or truth condition
 *   - Is a candidate for formalisation in a logical language
 */
export interface AlethicAssertoric {
  /** The raw natural language sentence string. */
  raw: string;
  /** Confidence score (0–1). Use 1.0 for manually validated sentences. */
  confidence: number;
}

/**
 * An ordered collection of validated assertoric sentences.
 * Passed as a unit to a formal language engine for formalisation.
 */
export interface SentenceSet {
  sentences: AlethicAssertoric[];
}
