# NLP Engine — Design

## Overview

The NLP engine is a zero-dependency, rule-based pipeline that turns raw text into
data structures usable by the formal language engines (propositional, quantificational, modal).

```
raw text / stream
    │
    ▼  TextSegmenter
sentence strings
    │
    ▼  SentenceClassifier
AlethicAssertoric[]   (non-assertoric sentences dropped)
    │
    ├─► ArgumentAnalyser  →  AnalysedArgument
    │                        (premise/conclusion roles, support/oppose relations)
    │
    └─► FormalAnnotator   →  AnnotatedSentence[]
            │                (connectives, quantifiers, modal adverbs, propositions)
            ▼
        FormalTranslator  →  FormalTranslationSet
                             ├─ propositional  (WFF-ready formula strings + proposition map)
                             ├─ quantificational  (QFF annotations + formula strings)
                             └─ modal  (MFF annotations + formula strings)
```

`NLPEngine.parse()` runs the full pipeline and returns an `NLPResult` containing
the `SentenceSet`, `AnnotatedSentence[]`, `AnalysedArgument`, and `FormalTranslationSet`.

`NLPEngine.parseStream()` accepts any `AsyncIterable<string>` (Node.js Readable,
file reader, web stream, etc.), collects all chunks, then runs the same pipeline.

---

## TextSegmenter

Splits raw text into sentence-candidate strings using a regex-based boundary detector.

**Rules (in priority order):**
1. Split on double newline `\n\n` — paragraph boundary, always a sentence break.
2. Split on `.` / `!` / `?` followed by whitespace + uppercase — standard EOS marker.
3. **Do not** split on `.` preceded by a known abbreviation (`Mr`, `Dr`, `St`, `vs`, `etc`, `e.g`, `i.e`, `approx`, single letters).
4. **Do not** split on `.` inside a decimal number (`3.14`).
5. Trim and discard blank segments.

---

## SentenceClassifier

Decides whether a sentence string is an *alethic assertoric* sentence and scores
its confidence. Non-assertoric sentences are silently dropped.

### Mood classification

| Signal | Mood | Assertoric? |
|--------|------|------------|
| Ends with `?` | Interrogative | No |
| Ends with `!` | Exclamatory | No |
| Starts with imperative verb (see list below) | Imperative | No |
| Otherwise | Declarative | Candidate |

**Imperative verb starters:** `Go`, `Stop`, `Run`, `Please`, `Do`, `Don't`, `Make`,
`Let`, `Be`, `Come`, `Take`, `Get`, `Give`, `Look`, `Show`, `Tell`, `Try`, `Use`,
`Find`, `Put`, `Keep`, `Turn`, `Open`, `Close`, `Start`, `Wait`, `Help`, `Move`.

### Confidence scoring

Base confidence for any declarative sentence: **0.5**

| Signal | Δ confidence |
|--------|-------------|
| Contains copula (`is`, `are`, `was`, `were`, `will be`, `has been`) | +0.15 |
| Contains epistemic/modal marker (`necessarily`, `must`, `certainly`, `it is certain`) | +0.15 |
| Contains hedging language (`maybe`, `perhaps`, `I think`, `I believe`, `probably`) | −0.15 |
| Subject-verb structure detected (starts with noun phrase + verb) | +0.10 |
| Very short sentence (< 4 words) | −0.10 |
| Sentence begins with `It is` / `There is` / `There are` | +0.10 |

Confidence is clamped to `[0.05, 1.0]`.

---

## ArgumentAnalyser

Detects argument structure within a `SentenceSet` — which sentences are premises,
which are conclusions, and what relations hold between pairs.

### Conclusion markers (sentence-initial)
`therefore`, `thus`, `hence`, `so`, `consequently`, `it follows that`,
`we can conclude`, `this means`, `in conclusion`, `as a result`.

### Premise markers (sentence-initial)
`because`, `since`, `given that`, `assuming`, `for`, `as we know`,
`it is known that`, `suppose`, `if we assume`.

### Relations

| Relation | Detection |
|----------|-----------|
| `supports` | Premise marker on sentence A, no explicit negation relative to B |
| `opposes` | Negation of a key proposition present in B detected in A |
| `independent` | No structural relation detected |

---

## FormalAnnotator

Extracts logical features from each `AlethicAssertoric` sentence, returning an
`AnnotatedSentence` with the following sub-structures.

### Connective triggers → BinaryOperator

| Natural language triggers | Operator |
|--------------------------|----------|
| `if … then`, `only if`, `implies`, `entails` | `->` |
| `if and only if`, `iff`, `just in case` | `<->` |
| `and`, `but`, `moreover`, `furthermore`, `both … and` | `&` |
| `or`, `either … or`, `unless` | `\|` |

### Negation triggers

`not`, `no`, `never`, `it is not the case that`, `it is false that`.

### Quantifier triggers → Quantifier

| Triggers | Quantifier |
|---------- |-----------|
| `all`, `every`, `each`, `any`, `for all`, `for every` | `∀` |
| `some`, `there is`, `there are`, `there exists`, `at least one` | `∃` |
| `no`, `none`, `nothing`, `no one`, `nobody`, `never` | `¬∃` |

### Modal adverb triggers → ModalOperator

| Triggers | Operator |
|---------|---------|
| `necessarily`, `must`, `it is necessary that`, `it is certain that`, `certainly` | `□` |
| `possibly`, `might`, `may`, `could`, `it is possible that`, `perhaps`, `maybe` | `◇` |

### Proposition extraction

Atomic proposition candidates are the maximal text spans that remain after removing
all detected connectives, quantifiers, modal adverbs, and negations from the sentence.
Each candidate is assigned a label (`p`, `q`, `r`, `s`, …) in left-to-right order
of appearance. The mapping from label → text fragment is stored in `propositionMap`.

---

## FormalTranslator

Produces a `FormalTranslationSet` from an `AnnotatedSentence[]`.

### Propositional translation

Uses the detected `ConnectiveAnnotation[]` and `NegationAnnotation[]` to build a
formula string. The algorithm:

1. If no connective detected → whole sentence maps to a single atom `p`.
2. If one connective detected → split sentence into left/right halves, assign atoms, emit `left OP right`.
3. If negation wraps a sub-formula → prefix with `~`.
4. Multiple connectives → processed left-to-right (flat, no nesting at this stage).

Returns a `formulaString` (e.g. `"p -> q"`) and a `propositionMap` recording which
text fragment each label refers to. **Does not construct WFF objects** — that is the
job of the SyntaxEngine (future). The translation is a guide for a human or tool to
populate a `PropositionalTheoryBuilder`.

### Quantificational translation

Wraps the propositional translation with detected quantifier prefixes:
`∀x`, `∃x`, `¬∃x`. Suggests predicate names derived from the proposition text.
Returns annotation metadata + formula string. Full QFF construction awaits
`QuantificationalSyntaxEngine`.

### Modal translation

Wraps the propositional translation with detected modal operator prefixes:
`□`, `◇`. Returns annotation metadata + formula string. Full MFF construction
awaits `ModalSyntaxEngine`.

---

## NLPResult (extended)

```ts
interface NLPResult {
  input: string;
  candidates: AlethicAssertoric[];      // backward-compatible
  sentenceSet: SentenceSet;             // same sentences as SentenceSet
  annotated: AnnotatedSentence[];       // features per sentence
  argument: AnalysedArgument;           // premise/conclusion structure
  translations: FormalTranslationSet;   // formal language translations
}
```
