import { AlethicAssertoric, SentenceSet } from '../../language/shared/types';

export { AlethicAssertoric };

// ---------------------------------------------------------------------------
// Sentence mood
// ---------------------------------------------------------------------------

export type MoodType = 'declarative' | 'interrogative' | 'imperative' | 'exclamatory';

// ---------------------------------------------------------------------------
// Feature annotations — individual logical features extracted from a sentence
// ---------------------------------------------------------------------------

/** A binary connective detected in the sentence text. */
export interface ConnectiveAnnotation {
  /** The matched trigger text (e.g. "if … then", "and"). */
  text: string;
  /** The corresponding formal binary operator. */
  operator: '&' | '|' | '->' | '<->';
  /** Character offsets [start, end) within the sentence's raw text. */
  span: [number, number];
}

/** A quantifier expression detected in the sentence text. */
export interface QuantifierAnnotation {
  /** The matched trigger text (e.g. "all", "there exists"). */
  text: string;
  /** The corresponding formal quantifier (¬∃ encodes "no/none"). */
  quantifier: '∀' | '∃' | '¬∃';
  /** Character offsets [start, end) within the sentence's raw text. */
  span: [number, number];
}

/** A modal adverb or phrase detected in the sentence text. */
export interface ModalAnnotation {
  /** The matched trigger text (e.g. "necessarily", "it is possible that"). */
  text: string;
  /** The corresponding modal operator. */
  operator: '□' | '◇';
  /** Character offsets [start, end) within the sentence's raw text. */
  span: [number, number];
}

/** A negation marker detected in the sentence text. */
export interface NegationAnnotation {
  /** The matched trigger text (e.g. "not", "it is not the case that"). */
  text: string;
  /** Character offsets [start, end) within the sentence's raw text. */
  span: [number, number];
}

/** An atomic proposition candidate extracted from the sentence. */
export interface PropositionAnnotation {
  /** The text fragment this proposition represents. */
  text: string;
  /** The assigned logical label (p, q, r, …). */
  label: string;
  /** Character offsets [start, end) within the sentence's raw text. */
  span: [number, number];
}

// ---------------------------------------------------------------------------
// SentenceFeatures — all features for one sentence
// ---------------------------------------------------------------------------

export interface SentenceFeatures {
  mood: MoodType;
  connectives: ConnectiveAnnotation[];
  quantifiers: QuantifierAnnotation[];
  modalAdverbs: ModalAnnotation[];
  negations: NegationAnnotation[];
  propositions: PropositionAnnotation[];
}

// ---------------------------------------------------------------------------
// AnnotatedSentence — an assertoric sentence plus its extracted features
// ---------------------------------------------------------------------------

export interface AnnotatedSentence {
  source: AlethicAssertoric;
  features: SentenceFeatures;
}

// ---------------------------------------------------------------------------
// ArgumentAnalyser output
// ---------------------------------------------------------------------------

export type ArgumentRelation = 'supports' | 'opposes' | 'independent';

export interface SentencePair {
  from: AlethicAssertoric;
  to: AlethicAssertoric;
  relation: ArgumentRelation;
}

export interface AnalysedArgument {
  sentences: AlethicAssertoric[];
  premises: AlethicAssertoric[];
  conclusions: AlethicAssertoric[];
  relations: SentencePair[];
}

// ---------------------------------------------------------------------------
// FormalTranslationSet — one translation per supported formal language
// ---------------------------------------------------------------------------

export interface PropositionalSentenceTranslation {
  source: AlethicAssertoric;
  /** Maps proposition label (p, q, …) to the text fragment it represents. */
  propositionMap: Record<string, string>;
  /** Human-readable formula string, e.g. "p -> q". */
  formulaString: string;
}

export interface PropositionalTranslation {
  sentences: PropositionalSentenceTranslation[];
}

export interface QuantificationalSentenceTranslation {
  source: AlethicAssertoric;
  propositionMap: Record<string, string>;
  /** Detected quantifier prefix, e.g. "∀x" or "∃x". Null if none detected. */
  quantifierPrefix: string | null;
  /** Suggested predicate name derived from the proposition text. */
  suggestedPredicate: string | null;
  formulaString: string;
}

export interface QuantificationalTranslation {
  sentences: QuantificationalSentenceTranslation[];
}

export interface ModalSentenceTranslation {
  source: AlethicAssertoric;
  propositionMap: Record<string, string>;
  /** Detected modal operator prefix, e.g. "□" or "◇". Null if none detected. */
  modalPrefix: string | null;
  formulaString: string;
}

export interface ModalTranslation {
  sentences: ModalSentenceTranslation[];
}

export interface FormalTranslationSet {
  source: SentenceSet;
  propositional: PropositionalTranslation;
  quantificational: QuantificationalTranslation;
  modal: ModalTranslation;
}

// ---------------------------------------------------------------------------
// NLPResult — the full output of NLPEngine.parse()
// ---------------------------------------------------------------------------

export interface NLPResult {
  /** The original input string passed to NLPEngine.parse(). */
  input: string;
  /** Zero or more assertoric sentence candidates found in the input. */
  candidates: AlethicAssertoric[];
  /** The same sentences as an ordered SentenceSet. */
  sentenceSet: SentenceSet;
  /** Feature-annotated version of every assertoric sentence. */
  annotated: AnnotatedSentence[];
  /** Detected argument structure across the sentence set. */
  argument: AnalysedArgument;
  /** Formal language translations for each sentence. */
  translations: FormalTranslationSet;
}
