import { AlethicAssertoric } from '../../language/shared/types';
import { PairwiseRelation } from '../../language/shared/theory';

// ─── Argument targeting ───────────────────────────────────────────────────────

/**
 * What an argument's sub-conclusion is directed at.
 *
 * - claim            — targets the central contention directly
 * - argument         — targets another argument's sub-conclusion
 * - premise          — targets a specific premise within another argument
 */
export type ArgumentTarget =
  | { kind: 'claim' }
  | { kind: 'argument'; argumentId: string }
  | { kind: 'premise'; argumentId: string; premiseIndex: number };

// ─── Argument stance ──────────────────────────────────────────────────────────

/**
 * How an argument relates to its target.
 *
 * - supports    — sub-conclusion establishes or corroborates the target
 * - attacks     — sub-conclusion entails the negation of the target
 * - qualifies   — narrows or conditions the target (reduces scope or strength)
 * - undermines  — attacks a presupposition of the target without directly
 *                 negating it
 * - concedes    — grants the target but limits its downstream implications
 */
export type ArgumentStance =
  | 'supports'
  | 'attacks'
  | 'qualifies'
  | 'undermines'
  | 'concedes';

// ─── Argument ─────────────────────────────────────────────────────────────────

/**
 * A single structured argument — a set of premises leading to a
 * sub-conclusion, directed at a target with a declared stance.
 */
export interface Argument {
  /** Unique identifier for this argument within the dialectical map. */
  id: string;
  /** Human-readable name for display (e.g. "The Deterrence Argument"). */
  label: string;
  /** The premises that ground this argument. May be empty. */
  premises: AlethicAssertoric[];
  /** The claim this argument establishes. */
  subConclusion: AlethicAssertoric;
  /** What this argument is directed at. */
  target: ArgumentTarget;
  /** How this argument relates to its target. */
  stance: ArgumentStance;
}

// ─── ContentiousClaim ────────────────────────────────────────────────────────

/** The central claim under dispute around which all arguments are organised. */
export interface ContentiousClaim {
  claim: AlethicAssertoric;
  label: string;
}

// ─── Evaluation output types ─────────────────────────────────────────────────

/**
 * How strongly the premises formally support the sub-conclusion.
 *
 * - valid         — premises ⊨ sub-conclusion (ENTAILS_RIGHT)
 * - consistent    — premises are consistent with sub-conclusion but do not entail it
 * - inconsistent  — premises are inconsistent with sub-conclusion
 * - undetermined  — zero premises or the NLP pipeline produced no usable formula
 */
export type EntailmentStrength =
  | 'valid'
  | 'consistent'
  | 'inconsistent'
  | 'undetermined';

/**
 * How the sub-conclusion relates to the central claim.
 *
 * - entails      — sub-conclusion ⊨ claim
 * - entailed-by  — claim ⊨ sub-conclusion
 * - equivalent   — sub-conclusion ⟺ claim
 * - contradicts  — sub-conclusion and claim cannot both be true
 * - consistent   — can both be true, no entailment in either direction
 * - undetermined — no shared propositions or NLP produced no usable formula
 */
export type ClaimRelation =
  | 'entails'
  | 'entailed-by'
  | 'equivalent'
  | 'contradicts'
  | 'consistent'
  | 'undetermined';

/** Formal evaluation of a single argument. */
export interface ArgumentEvaluation {
  /** The id of the argument this evaluation applies to. */
  argumentId: string;
  /** Whether the premises formally entail the sub-conclusion. */
  internalValidity: EntailmentStrength;
  /** How the sub-conclusion relates to the central claim. */
  claimRelation: ClaimRelation;
  /**
   * Aggregate strength score in [0, 1].
   *
   * Computed as: mean(premise.confidence) × validityWeight
   * where validityWeight is 1.0 (valid), 0.5 (consistent), 0.0 (otherwise).
   */
  strength: number;
}

/** Pairwise formal tension between two arguments' sub-conclusions. */
export interface ArgumentTension {
  argumentIdA: string;
  argumentIdB: string;
  /** The pairwise logical relation between the two sub-conclusions. */
  conclusionRelation: PairwiseRelation;
}

/** Full output of DialecticalMap.evaluate(). */
export interface DialecticalMapResult {
  claim: ContentiousClaim;
  arguments: Argument[];
  /** One evaluation per argument, in input order. */
  evaluations: ArgumentEvaluation[];
  /** C(n, 2) pairwise tension records for n arguments, in (i, j) order. */
  tensions: ArgumentTension[];
}
