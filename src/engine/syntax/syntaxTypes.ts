/**
 * Syntax DTOs — constituency parse trees and related types.
 *
 * All types are plain data interfaces (no methods, no classes) designed for
 * easy serialization. The discriminated-union pattern used for `SyntaxNode`
 * maps cleanly to protobuf `oneof` fields. Arrays are used throughout in
 * preference to `Map` for the same reason. A `schemaVersion` field on
 * top-level DTOs enables forward-compatible schema evolution.
 *
 * Intended serialization paths (current and future):
 *   - JSON  : natively supported — all field types are JSON-primitive
 *   - Protobuf : `kind` → oneof discriminator; `PhraseLabel`/`POSTag` → enum;
 *                `SyntaxNode[]` → repeated oneof message
 *   - MessagePack / CBOR : same shape as JSON
 */

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------

/** Bumped when the shape of any DTO changes in a breaking way. */
export const SYNTAX_SCHEMA_VERSION = '1' as const;

// ---------------------------------------------------------------------------
// Vocabulary types
// ---------------------------------------------------------------------------

/**
 * Constituent phrase categories (non-terminal labels).
 *
 * Maps to a protobuf enum `PhraseLabel`.
 */
export type PhraseLabel =
  | 'S'    // Sentence (root)
  | 'NP'   // Noun Phrase
  | 'VP'   // Verb Phrase
  | 'PP'   // Prepositional Phrase
  | 'AP'   // Adjective Phrase
  | 'AdvP' // Adverb Phrase (includes sentence-initial modal adverbs)
  | 'CP'   // Complementizer Phrase (subordinate / conditional clauses)
  | 'QP';  // Quantifier Phrase

/**
 * Part-of-speech tags for terminal (leaf) nodes.
 *
 * Maps to a protobuf enum `POSTag`.
 */
export type POSTag =
  | 'DET'     // Determiner: the, a, an, this, that
  | 'QUANT'   // Quantifier: all, every, each, any, some, no, most, few
  | 'N'       // Common noun
  | 'PN'      // Proper noun (capitalized, not sentence-initial)
  | 'PRON'    // Pronoun: he, she, it, they, I, we
  | 'V'       // Main verb (including gerunds used predicatively)
  | 'COP'     // Copula: is, are, was, were, am, be, been
  | 'AUX'     // Non-modal auxiliary: have, has, had, do, does, did
  | 'MODAL'   // Modal verb: must, can, could, should, would, may, might, shall, will
  | 'ADJ'     // Adjective
  | 'ADV'     // Adverb (including modal adverbs: necessarily, possibly, certainly)
  | 'PREP'    // Preposition: in, on, at, of, by, for, with, to, from
  | 'CONJ'    // Coordinating conjunction: and, or, but, nor, yet, so
  | 'COMP'    // Complementizer: that, if, whether, because, since, although, unless
  | 'NEG'     // Negation: not, never, no (negation context)
  | 'PART'    // Particle: then (in if-then), to (infinitive marker)
  | 'PUNCT'   // Punctuation: . , ; : ! ?
  | 'UNKNOWN'; // Unrecognized token

// ---------------------------------------------------------------------------
// Token layer
// ---------------------------------------------------------------------------

/**
 * A single tokenized word with its POS tag.
 * The intermediate representation between the raw sentence and the tree.
 *
 * Protobuf field notes:
 *   text  → string (field 1)
 *   pos   → POSTag enum (field 2)
 *   index → int32 (field 3)
 */
export interface TaggedToken {
  /** Surface form of the token, as it appears in the source text. */
  text: string;
  /** Assigned part-of-speech tag. */
  pos: POSTag;
  /** Zero-based position in the sentence's token sequence. */
  index: number;
}

// ---------------------------------------------------------------------------
// Tree node layer — discriminated union
// ---------------------------------------------------------------------------

/**
 * A leaf node: a single word/token positioned in the sentence.
 *
 * Protobuf field notes:
 *   kind  → oneof discriminator string, always "terminal" (field 1)
 *   pos   → POSTag enum (field 2)
 *   text  → string (field 3)
 *   index → int32 (field 4)
 */
export interface TerminalNode {
  /** Discriminator. Always `'terminal'`. */
  kind: 'terminal';
  /** Part-of-speech category of this word. */
  pos: POSTag;
  /** Surface form of the word. */
  text: string;
  /** Zero-based token index in the sentence. */
  index: number;
}

/**
 * An internal node: a labelled phrase spanning one or more tokens.
 *
 * Protobuf field notes:
 *   kind       → oneof discriminator string, always "phrase" (field 1)
 *   label      → PhraseLabel enum (field 2)
 *   children   → repeated SyntaxNode oneof (field 3)
 *   startIndex → int32, inclusive (field 4)
 *   endIndex   → int32, exclusive (field 5)
 */
export interface PhraseNode {
  /** Discriminator. Always `'phrase'`. */
  kind: 'phrase';
  /** Constituent category of this phrase. */
  label: PhraseLabel;
  /** Ordered child nodes — phrases or terminals. */
  children: SyntaxNode[];
  /** Token index of the first terminal in this span (inclusive). */
  startIndex: number;
  /** Token index past the last terminal in this span (exclusive). */
  endIndex: number;
}

/**
 * A node in a constituency syntax tree.
 * Use `node.kind` to discriminate between `TerminalNode` and `PhraseNode`.
 */
export type SyntaxNode = TerminalNode | PhraseNode;

// ---------------------------------------------------------------------------
// Top-level document DTO
// ---------------------------------------------------------------------------

/**
 * The full constituency parse of a single sentence.
 *
 * Designed as a self-contained, serializable record. All information needed
 * to reconstruct or display the parse is present — no external references.
 *
 * Protobuf message: `SyntaxTree`
 *   schemaVersion → string (field 1)
 *   source        → string (field 2)
 *   tokens        → repeated TaggedToken (field 3)
 *   root          → PhraseNode (field 4)
 */
export interface SyntaxTree {
  /** Schema version. Bump when DTO shape changes. Currently `'1'`. */
  schemaVersion: string;
  /** The original sentence string that was parsed. */
  source: string;
  /** Ordered token sequence with POS tags (the pre-terminal layer). */
  tokens: TaggedToken[];
  /** The root `S` node of the constituency tree. */
  root: PhraseNode;
}
