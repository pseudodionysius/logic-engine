import { Formula, AlethicAssertoric } from './types';

/**
 * A sentence within a formal theory — pairs the source natural language
 * sentence with its formal representation in a given logic.
 */
export interface FormalSentence<F extends Formula> {
  /** The natural language sentence this formula was derived from. */
  source: AlethicAssertoric;
  /** The formal representation in the target logical language. */
  formula: F;
  /** Human-readable label used in proof and graph output (e.g. "φ₁", "P1"). */
  label: string;
}

/**
 * A node in a structured proof tree.
 */
export interface ProofNode {
  label: string;
  children: ProofNode[];
}

/**
 * The outcome of a consistency check over a theory's sentence set.
 *
 * For a consistent theory, `witness` is a variable assignment under which
 * every sentence is true.
 *
 * For an inconsistent theory, `failedValuations` records, for every
 * possible assignment, which sentence first failed — proving exhaustion.
 */
export interface ConsistencyResult {
  isConsistent: boolean;
  /** A satisfying variable assignment if the theory is consistent. */
  witness?: Record<string, boolean>;
  /** Evidence of exhaustion for each valuation if the theory is inconsistent. */
  failedValuations?: Array<{
    valuation: Record<string, boolean>;
    firstFailure: string;
  }>;
}

/**
 * A formal theory in a logical language — a set of formalised sentences
 * with operations for consistency checking and structured output.
 *
 * Implementors are expected to support exhaustive truth-table evaluation
 * and to produce both a structured proof tree and a console-printable
 * logical relations graph.
 */
export interface Theory<F extends Formula> {
  /** The sentences constituting this theory. */
  sentences: FormalSentence<F>[];

  /** Determine whether all sentences can be simultaneously true. */
  checkConsistency(): ConsistencyResult;

  /**
   * Build a structured proof tree of the consistency result.
   * The root node carries the verdict; children carry the justification.
   */
  buildProofTree(): ProofNode;

  /** Print the proof tree to the console. */
  printProof(): void;

  /**
   * Print a graph of logical relations between sentences to the console.
   * Shows pairwise consistency, entailment, and shared variables.
   */
  printGraph(): void;
}
