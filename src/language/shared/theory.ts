import { Formula, AlethicAssertoric } from './types';

// ─── Pairwise relation types ──────────────────────────────────────────────────

/**
 * The logical relation between two sentences determined by exhaustive
 * evaluation over all variable assignments.
 *
 * - INCONSISTENT   — no assignment makes both sentences true simultaneously
 * - EQUIVALENT     — both sentences have the same truth value in every assignment
 * - ENTAILS_RIGHT  — s1 ⊨ s2: whenever s1 is true, s2 is also true
 * - ENTAILS_LEFT   — s2 ⊨ s1: whenever s2 is true, s1 is also true
 * - CONSISTENT     — there exists an assignment making both sentences true,
 *                    but neither entails the other
 */
export type PairwiseRelation =
  | 'INCONSISTENT'
  | 'EQUIVALENT'
  | 'ENTAILS_LEFT'    // s1 ⊨ s2 (no case where s1=T and s2=F)
  | 'ENTAILS_RIGHT'   // s2 ⊨ s1 (no case where s1=F and s2=T)
  | 'CONSISTENT';

/** A typed pairwise relation record returned by Theory.pairwiseRelations(). */
export interface PairwiseSentenceRelation<F extends Formula> {
  a: FormalSentence<F>;
  b: FormalSentence<F>;
  relation: PairwiseRelation;
}

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
  /** Human-readable text describing this node (verdict, sub-claim, or sentence row). */
  label: string;
  /** Ordered child nodes that justify or elaborate on this node's label. */
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
export interface ConsistencyResult<V = boolean> {
  /** True when a satisfying variable assignment exists; false otherwise. */
  isConsistent: boolean;
  /** A satisfying variable assignment if the theory is consistent. */
  witness?: Record<string, V>;
  /** Evidence of exhaustion for each valuation if the theory is inconsistent. */
  failedValuations?: Array<{
    valuation: Record<string, V>;
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
export interface Theory<F extends Formula, V = boolean> {
  /** The sentences constituting this theory. */
  sentences: FormalSentence<F>[];

  /** Determine whether all sentences can be simultaneously true. */
  checkConsistency(): ConsistencyResult<V>;

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

  /**
   * Return the pairwise logical relation for every (i, j) pair of sentences
   * where i < j, as typed data.
   *
   * The array has C(n, 2) entries for n sentences.
   */
  pairwiseRelations(): PairwiseSentenceRelation<F>[];
}
