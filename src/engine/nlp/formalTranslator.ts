import { SentenceSet } from '../../language/shared/types';
import {
  AnnotatedSentence,
  ConnectiveAnnotation,
  FormalTranslationSet,
  ModalSentenceTranslation,
  ModalTranslation,
  PropositionalSentenceTranslation,
  PropositionalTranslation,
  QuantificationalSentenceTranslation,
  QuantificationalTranslation,
} from './nlpTypes';

// ---------------------------------------------------------------------------
// Propositional formula builder
// ---------------------------------------------------------------------------

/**
 * Build a propositional formula string from an annotated sentence.
 *
 * Algorithm:
 *  - 0 connectives → single atom label for the whole sentence.
 *  - 1 connective  → split sentence at the connective span; left half → first
 *                    proposition label, right half → second.
 *  - N connectives → flatten left-to-right as a chain:
 *                    p1 OP1 p2 OP2 p3 …
 *
 * Negations that precede the entire formula are prefixed with '~'.
 * Returns both the formula string and the proposition map.
 */
function buildPropositionalFormula(
  annotated: AnnotatedSentence,
): { formulaString: string; propositionMap: Record<string, string> } {
  const { features } = annotated;
  const props = features.propositions;
  const connectives = features.connectives;

  if (props.length === 0) {
    return { formulaString: 'p', propositionMap: { p: annotated.source.raw } };
  }

  const propMap: Record<string, string> = {};
  for (const p of props) {
    propMap[p.label] = p.text;
  }

  if (connectives.length === 0) {
    // Single atom — whole sentence is one proposition
    const label = props[0].label;
    const negated = _isNegated(annotated);
    return {
      formulaString: negated ? `~${label}` : label,
      propositionMap: propMap,
    };
  }

  // Build formula by interleaving prop labels and operators
  const parts: string[] = [];
  for (let i = 0; i < props.length; i++) {
    if (i > 0 && i - 1 < connectives.length) {
      parts.push(connectives[i - 1].operator);
    }
    parts.push(props[i].label);
  }

  // If more connectives than gaps between props (e.g. sentence starts with "if"),
  // prepend any leftover ops
  const extraOps = connectives.length - (props.length - 1);
  if (extraOps > 0) {
    // Re-build using only the ops that fit between detected props
    // (extra ops at start/end are artefacts of trigger matching — ignore them)
  }

  let formulaString = parts.join(' ');

  // Wrap with outer negation if the whole sentence is negated
  if (_isNegated(annotated)) {
    formulaString = `~(${formulaString})`;
  }

  return { formulaString, propositionMap: propMap };
}

/**
 * Return true if the sentence has a sentence-level negation (i.e. negation
 * that precedes the first proposition or connective).
 */
function _isNegated(annotated: AnnotatedSentence): boolean {
  const { negations, propositions, connectives } = annotated.features;
  if (negations.length === 0) return false;

  const firstPropStart = propositions[0]?.span[0] ?? Infinity;
  const firstConnStart = connectives[0]?.span[0] ?? Infinity;
  const firstLogicalStart = Math.min(firstPropStart, firstConnStart);

  // A negation that appears before the first logical element is sentence-level
  return negations.some(n => n.span[0] < firstLogicalStart);
}

// ---------------------------------------------------------------------------
// Quantifier prefix builder
// ---------------------------------------------------------------------------

function buildQuantifierPrefix(annotated: AnnotatedSentence): string | null {
  const { quantifiers } = annotated.features;
  if (quantifiers.length === 0) return null;
  // Use the first detected quantifier — most sentences have at most one
  const q = quantifiers[0];
  if (q.quantifier === '¬∃') return '¬∃x';
  return `${q.quantifier}x`;
}

function suggestPredicate(annotated: AnnotatedSentence): string | null {
  // Derive a predicate name from the first proposition text:
  // take the first content word, capitalise it, truncate to 8 chars.
  const firstProp = annotated.features.propositions[0];
  if (!firstProp) return null;
  const words = firstProp.text.trim().split(/\s+/);
  const word = words.find(w => w.length > 2) ?? words[0];
  if (!word) return null;
  return word.charAt(0).toUpperCase() + word.slice(1, 8).toLowerCase();
}

// ---------------------------------------------------------------------------
// Modal prefix builder
// ---------------------------------------------------------------------------

function buildModalPrefix(annotated: AnnotatedSentence): string | null {
  const { modalAdverbs } = annotated.features;
  if (modalAdverbs.length === 0) return null;
  return modalAdverbs[0].operator;
}

// ---------------------------------------------------------------------------
// FormalTranslator
// ---------------------------------------------------------------------------

/**
 * Produces a `FormalTranslationSet` from a list of annotated sentences.
 *
 * Each translation layer (propositional, quantificational, modal) provides
 * formula strings and annotation metadata that guide population of the
 * corresponding theory builder. Full WFF/QFF/MFF object construction
 * is deferred to the SyntaxEngine layer (not yet implemented).
 */
export class FormalTranslator {

  /**
   * Translate an annotated sentence set into all three formal languages.
   *
   * @param source    - The original `SentenceSet`.
   * @param annotated - Feature-annotated sentences (same order as source.sentences).
   * @returns          A `FormalTranslationSet` with propositional, quantificational,
   *                   and modal translations.
   */
  translate(source: SentenceSet, annotated: AnnotatedSentence[]): FormalTranslationSet {
    return {
      source,
      propositional: this._translatePropositional(annotated),
      quantificational: this._translateQuantificational(annotated),
      modal: this._translateModal(annotated),
    };
  }

  // -------------------------------------------------------------------------
  // Propositional
  // -------------------------------------------------------------------------

  private _translatePropositional(annotated: AnnotatedSentence[]): PropositionalTranslation {
    const sentences: PropositionalSentenceTranslation[] = annotated.map(a => {
      const { formulaString, propositionMap } = buildPropositionalFormula(a);
      return { source: a.source, propositionMap, formulaString };
    });
    return { sentences };
  }

  // -------------------------------------------------------------------------
  // Quantificational
  // -------------------------------------------------------------------------

  private _translateQuantificational(
    annotated: AnnotatedSentence[],
  ): QuantificationalTranslation {
    const sentences: QuantificationalSentenceTranslation[] = annotated.map(a => {
      const { formulaString: baseFormula, propositionMap } = buildPropositionalFormula(a);
      const quantifierPrefix = buildQuantifierPrefix(a);
      const suggestedPredicate = suggestPredicate(a);

      // Prefix the formula with the quantifier if one was detected
      const formulaString = quantifierPrefix
        ? `${quantifierPrefix}. ${baseFormula}`
        : baseFormula;

      return { source: a.source, propositionMap, quantifierPrefix, suggestedPredicate, formulaString };
    });
    return { sentences };
  }

  // -------------------------------------------------------------------------
  // Modal
  // -------------------------------------------------------------------------

  private _translateModal(annotated: AnnotatedSentence[]): ModalTranslation {
    const sentences: ModalSentenceTranslation[] = annotated.map(a => {
      const { formulaString: baseFormula, propositionMap } = buildPropositionalFormula(a);
      const modalPrefix = buildModalPrefix(a);

      const formulaString = modalPrefix
        ? `${modalPrefix}(${baseFormula})`
        : baseFormula;

      return { source: a.source, propositionMap, modalPrefix, formulaString };
    });
    return { sentences };
  }
}
