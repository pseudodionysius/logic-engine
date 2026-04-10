# Logic Engine — CLAUDE.md

## Project Overview

A TypeScript npm library (`logic-engine`) providing types and runtime evaluation for formal logical languages. The primary use cases are building proof systems, formalising natural language processing, and educational exploration of logic. Published to npm at version `1.0.1`.

## Commands

```bash
npm test          # Run all Jest tests (via tsconfig.test.json)
npm run build     # Compile TypeScript → dist/ (via tsconfig.build.json)
```

Tests use `ts-jest` directly against source — no build step required before running tests.

## CI/CD

### Test pipeline: `.github/workflows/test.yml`

Runs automatically on every push and PR to `master`. Executes `npm ci` then `npm test`. Must pass before merging.

### Publish pipeline: `.github/workflows/publish.yml`

**Manual only** via `workflow_dispatch`. Never triggers on push.

Trigger: **Actions → "Publish to NPM" → Run workflow** — choose `patch`, `minor`, or `major`.

Pipeline: `npm ci` → `npm test` → `npm run build` → `npm version <bump>` → `git push --follow-tags` → `npm publish`

| Secret | Where to get it |
| --- | --- |
| `NPM_TOKEN` | npmjs.com → Profile → Access Tokens → Automation type |

## Architecture

Tests mirror source structure exactly: every `src/a/b/c.ts` has a corresponding `test/a/b/c.spec.ts`.

```text
src/
  index.ts                                           # Re-exports language + engine
  language/
    shared/
      types.ts                                       # Formula, AlethicAssertoric, SentenceSet
      theory.ts                                      # FormalSentence<F>, ConsistencyResult<V>,
                                                      # ProofNode, Theory<F, V> interface
    propositional/
      propositionalTypes.d.ts                        # WFF, Atom, Complex, operators
      atom.ts                                        # AtomImpl
      complex.ts                                     # ComplexImpl
      wffBuilder.ts                                  # WFFBuilder factory
      propositionalUtils.ts                          # binaryOperatorToLogic, isAtom, isComplex
      propositionalVariable.ts                       # PropositionalVariable (named, mutable var)
      propositionalTheory.ts                         # PropositionalTheory, PropositionalFormalSentence
      propositionalTheoryBuilder.ts                  # PropositionalTheoryBuilder (fluent builder)
      index.ts
    quantificational/
      quantificationalTypes.d.ts                     # QFF, Term, Predicate, Quantifier, operators
      term.ts                                        # VariableTerm, ConstantTerm
      predicate.ts                                   # PredicateImpl
      atomicFormula.ts                               # AtomicFormulaImpl
      complexFormula.ts                              # ComplexFormulaImpl
      quantifiedFormula.ts                           # QuantifiedFormulaImpl (∀, ∃)
      quantificationalVariable.ts                    # QuantificationalVariable
      quantificationalUtils.ts                       # binaryOperatorToLogic, type guards
      quantificationalTheory.ts                      # QuantificationalTheory
      quantificationalTheoryBuilder.ts               # QuantificationalTheoryBuilder
      index.ts
    modal/
      modalTypes.d.ts                                # MFF, World, ModalOperator, ModalEvaluationState, ModalSystemSpec
      modalSystems.ts                                # SystemK, SystemT, SystemD, SystemS4, SystemS5
      modalAtom.ts                                   # ModalAtomImpl
      modalComplex.ts                                # ModalComplexImpl
      modalFormula.ts                                # ModalFormulaImpl (□, ◇)
      modalVariable.ts                               # ModalVariable
      modalUtils.ts                                  # binaryOperatorToLogic, type guards
      modalTheory.ts                                 # ModalTheory, ModalFormalSentence
      modalTheoryBuilder.ts                          # ModalTheoryBuilder
      index.ts
  engine/
    nlp/
      nlpTypes.ts                                    # NLPResult, AnnotatedSentence, SentenceFeatures, FormalTranslationSet, …
      nlpEngine.ts                                   # NLPEngine — top-level pipeline orchestrator
      textSegmenter.ts                               # TextSegmenter — sentence boundary detection + AsyncIterable support
      sentenceClassifier.ts                          # SentenceClassifier — mood detection + confidence scoring
      argumentAnalyser.ts                            # ArgumentAnalyser — premise/conclusion detection, pairwise relations
      formalAnnotator.ts                             # FormalAnnotator — feature extraction + syntax tree attachment
      formalTranslator.ts                            # FormalTranslator — formula string generation for all three languages
      index.ts
    syntax/
      syntaxTypes.ts                                 # SyntaxTree DTOs — TaggedToken, TerminalNode, PhraseNode, SyntaxTree
      naturalLanguageSyntaxParser.ts                 # NaturalLanguageSyntaxParser — constituency parse tree builder
      syntaxTreePrinter.ts                           # SyntaxTreePrinter — box-drawing, token list, bracketed notation
      index.ts
      propositional/
        syntaxEngine.ts                              # PropositionalSyntaxEngine — formula string → WFF (recursive descent)
    semantics/
      propositional/
        evaluationEngine.ts                          # PropositionalEvaluationEngine — truth tables, classification

test/
  language/
    propositional/
      atom.spec.ts
      complex.spec.ts
      propositionalUtils.spec.ts
      propositionalVariable.spec.ts
      propositionalTheory.spec.ts
      meta-logic/
        completeness.spec.ts                         # Full proof (135 tests total)
        expressiveAdequacy.spec.ts                   # Full inductive proof
    quantificational/
      term.spec.ts
      predicate.spec.ts
      atomicFormula.spec.ts
      complexFormula.spec.ts
      quantifiedFormula.spec.ts
      quantificationalTheory.spec.ts
      meta-logic/
        completeness.spec.ts                         # Structural induction + quantifier duality
    modal/
      modalAtom.spec.ts
      modalComplex.spec.ts
      modalFormula.spec.ts
      modalTheory.spec.ts                            # Builder, consistency, proof tree, system validation
      meta-logic/
        completeness.spec.ts                         # K axiom, modal duality, distribution, non-theorems
  engine/
    nlp/
      nlpEngine.spec.ts
      textSegmenter.spec.ts
      sentenceClassifier.spec.ts
      argumentAnalyser.spec.ts
      formalAnnotator.spec.ts
      formalTranslator.spec.ts
    syntax/
      naturalLanguageSyntaxParser.spec.ts
      syntaxTreePrinter.spec.ts
      propositional/syntaxEngine.spec.ts
    semantics/propositional/evaluationEngine.spec.ts
```

### TypeScript Config Split

| File | Purpose |
| --- | --- |
| `tsconfig.json` | IDE base — includes `src/` + `test/`, target es2017, no emit |
| `tsconfig.build.json` | Build only — `src/` → `dist/`, emits declarations |
| `tsconfig.test.json` | Jest — extends base, `noEmit: true` |

### Path Aliases (tsconfig)

| Alias | Resolves to |
| --- | --- |
| `@src/*` | `src/*` |
| `@test/*` | `test/*` |
| `@language/*` | `src/language/*` |
| `@propositional/*` | `src/language/propositional/*` |
| `@quantificational/*` | `src/language/quantificational/*` |
| `@engine/*` | `src/engine/*` |
| `@nlp/*` | `src/engine/nlp/*` |

## Shared Types

### `src/language/shared/types.ts`

| Type | Role |
| --- | --- |
| `Formula` | Root evaluation contract — `value(): boolean` |
| `AlethicAssertoric` | Universal input type: `{ raw: string; confidence: number }` |
| `SentenceSet` | Ordered collection of `AlethicAssertoric` sentences |

`AlethicAssertoric` is the single source of truth for the sentence type used by both the NLP engine (as output) and all formal language engines (as input). `nlpTypes.ts` re-exports it from here.

### `src/language/shared/theory.ts`

| Type | Role |
| --- | --- |
| `FormalSentence<F>` | Pairs `AlethicAssertoric` source with a typed formula `F` and a label |
| `ConsistencyResult<V>` | Outcome of a consistency check: witness or failed valuations (`V` defaults to `boolean`, quantificational uses `DomainElement`) |
| `ProofNode` | Node in a structured proof tree |
| `Theory<F, V>` | Interface all formal theories must implement (`V` is the valuation value type) |

## Propositional Logic — What's Implemented

### WFF primitives

- `AtomImpl` — boolean literal or `() => boolean` thunk; optional `'~'` negation
- `ComplexImpl` — two WFFs joined by a binary operator; optional outer `'~'`
- `WFFBuilder` — factory: inspects input shape, returns `AtomImpl` or `ComplexImpl`
- `binaryOperatorToLogic` — maps `'&' | '|' | '->' | '<->'` to their truth-functional semantics
- `isAtom` / `isComplex` — structural type guards

### Theory data structure

**`PropositionalVariable`** — named variable with a mutable value. All `AtomImpl` instances created via `.atom()` share the same underlying value via closure, so assigning the variable updates every derived atom simultaneously.

**`PropositionalTheory`** — built from a set of `PropositionalFormalSentence` records (each pairing an `AlethicAssertoric` with a `WFF` and variable membership list). Implements `Theory<WFF>`:

- `checkConsistency()` — exhaustive 2^n truth-table evaluation; returns `ConsistencyResult` with a satisfying witness or an exhaustion record
- `buildProofTree()` — structured `ProofNode` tree of the consistency result
- `printProof()` — prints the proof tree to the console with box-drawing characters
- `printGraph()` — prints pairwise logical relations (consistent / entails / equivalent / inconsistent) and shared-variable edges

**`PropositionalTheoryBuilder`** — fluent builder:

```ts
const builder = new PropositionalTheoryBuilder();
const p = builder.variable('p');
const q = builder.variable('q');
builder
  .sentence({ raw: 'It is raining', confidence: 1.0 }, p.atom(), ['p'])
  .sentence({ raw: 'If raining, wet', confidence: 1.0 },
            new ComplexImpl(undefined, p.atom(), '->', q.atom()), ['p', 'q'])
  .sentence({ raw: 'It is wet', confidence: 1.0 }, q.atom(), ['q']);
const theory = builder.build();
theory.printProof();
theory.printGraph();
```

`fromSentenceSet(SentenceSet)` is a typed stub — will be wired to `PropositionalSyntaxEngine` when implemented.

### Meta-logic proofs

- **Expressive adequacy** — inductive proof: base case covers all 4 unary truth functions; Shannon expansion is the inductive step; all 16 binary truth functions verified via DNF
- **Completeness** — structural induction proof: `value()` is semantically correct at every level; known tautologies, contradictions, and contingencies classified correctly

## Quantificational Logic — What's Implemented

### Formula types

- `DomainElement` — `string | number`, the elements of a finite domain of discourse
- `VariableAssignment` — `Map<string, DomainElement>`, maps variable names to domain elements
- `Term` — either a `VariableTerm` (resolved from assignment) or `ConstantTerm` (fixed element)
- `Predicate` / `PredicateImpl` — n-ary relation with arity enforcement
- `QFF` — Quantificational Formula, analogous to WFF; all valid first-order expressions
- `AtomicFormulaImpl` — predicate applied to terms (analogous to `AtomImpl`)
- `ComplexFormulaImpl` — two QFFs joined by a binary operator (same as propositional)
- `QuantifiedFormulaImpl` — `∀` or `∃` binding a variable over a finite domain
- Same operators as propositional: `~`, `&`, `|`, `->`, `<->`

### Theory data structure

**`QuantificationalVariable`** — named individual variable with mutable domain-element binding via shared assignment map. All formulas referencing this variable read its current binding.

**`QuantificationalTheory`** — implements `Theory<QFF, DomainElement>`:
- `checkConsistency()` — exhaustive `|D|^n` assignment enumeration
- `buildProofTree()`, `printProof()`, `printGraph()` — same structure as propositional

**`QuantificationalTheoryBuilder`** — fluent builder with `domain()`, `variable()`, `predicate()`, `sentence()`, `build()`.

### Meta-logic proofs

- **Completeness** — structural induction over AtomicFormula, ComplexFormula, QuantifiedFormula
- **Quantifier duality** — `~∀x.F(x) ⟺ ∃x.~F(x)` and `~∃x.F(x) ⟺ ∀x.~F(x)`, verified over domains up to size 3
- **Valid formulas** — universal instantiation, existential generalisation, distribution of ∀ over &
- **Identity properties** — reflexivity and substitution (verified via exhaustive model checking)

## Modal Logic — What's Implemented

### Type system

- `World` — `string`, the points of evaluation in Kripke semantics
- `ModalEvaluationState` — shared mutable state: `currentWorld: World` + `valuation: Map<string, Set<World>>`
- `MFF` — Modal Formula, the union of all valid modal expressions (analogous to WFF/QFF)
- `ModalSystemSpec` — interface: `name` + `validateFrame(worlds, accessibility)` — encapsulates frame conditions independently of the language layer
- Same operators as propositional: `~`, `&`, `|`, `->`, `<->`
- Modal operators: `□` (necessity), `◇` (possibility)

### Modal formula types

- `ModalAtomImpl` — proposition letter; reads truth value from `valuation[name]` at `currentWorld`
- `ModalComplexImpl` — two MFFs joined by a binary connective (identical semantics to propositional)
- `ModalFormulaImpl` — `□` or `◇` operator; iterates over worlds accessible from `currentWorld` via the accessibility relation (directly parallels `QuantifiedFormulaImpl` iterating over domain elements); restores `currentWorld` after evaluation

### Systems (frame conditions)

Five concrete `ModalSystemSpec` objects are provided:

| Export | Name | Frame condition |
| --- | --- | --- |
| `SystemK` | K | None — any frame valid |
| `SystemT` | T | Reflexive: `wRw` for all `w` |
| `SystemD` | D | Serial: every world has at least one successor |
| `SystemS4` | S4 | Reflexive + Transitive |
| `SystemS5` | S5 | Reflexive + Transitive + Symmetric |

**Language layer is system-agnostic.** `ModalAtomImpl`, `ModalComplexImpl`, `ModalFormulaImpl`, and `ModalVariable` contain zero system references. Systems only affect `ModalTheoryBuilder.build()` validation and `printProof()`/`printGraph()` labels.

### Theory data structure

**`ModalVariable`** — named proposition letter; `atom(negated?)` returns a `ModalAtomImpl` referencing the shared state.

**`ModalTheory`** — implements `Theory<MFF, boolean>`:

- `checkConsistency()` — exhaustive 2^(|P|×|W|) enumeration; witness keyed as `prop@world`
- `buildProofTree()` — includes Kripke frame node (worlds, accessibility pairs, designated world) and per-world valuation table; distinct from propositional/quantificational proof trees which show variable assignments
- `printProof()`, `printGraph()` — same interface as other theories; system name appears in header

**`ModalTheoryBuilder`** — fluent builder: `system()` (default `SystemK`), `worlds()`, `accessibility()`, `designatedWorld()`, `proposition()`, `sentence()`, `build()`. `build()` calls `system.validateFrame()` before constructing the theory — throws with a descriptive message if the frame violates the system's conditions.

### Meta-logic proofs

- **Completeness** — structural induction over `ModalAtomImpl`, `ModalComplexImpl`, `ModalFormulaImpl`; exhaustive evaluation verified as a decision procedure
- **Modal duality** — `□p ⟺ ~◇~p` and `◇p ⟺ ~□~p`, verified over 6 distinct frame structures
- **K axiom** — `□(p → q) → (□p → □q)`, verified exhaustively on all test frames
- **Distribution** — `□(p & q) ⟺ (□p & □q)`, verified exhaustively
- **Necessitation** — `□(p | ~p)` valid on every frame
- **Non-theorems of K** — `□p → p` (requires T), `□p → □□p` (requires 4), `◇p → □◇p` (requires 5): countermodels constructed and verified

### Design notes

`docs/modal/design.md` covers Kripke semantics, system hierarchy, and the analogy table between quantificational and modal constructs (domain ↔ worlds, ∀/∃ ↔ □/◇, etc.).

## NLP Engine — What's Implemented

The pipeline is fully implemented in `src/engine/nlp/`. All processing is rule-based and zero-dependency.

### Pipeline stages

**`TextSegmenter`** — splits raw text into sentence strings.

- Paragraph breaks (double newlines) always act as boundaries.
- Dot-based boundaries require whitespace + uppercase following and respect common abbreviations (`Mr.`, `Dr.`, etc.) and decimal numbers.
- `segment(text: string): string[]` — eager, for string input.
- `segmentStream(source: AsyncIterable<string>): Promise<string[]>` — lazy, buffers chunks then segments.

**`SentenceClassifier`** — filters to alethic assertoric sentences and scores confidence.

- `classify(sentence): AlethicAssertoric | null` — returns `null` for interrogative, imperative, and exclamatory moods.
- Confidence scoring: base 0.5 ± rule adjustments (copula, epistemic markers, hedging language, sentence length, subject-verb pattern). Clamped to [0.05, 1.0].
- `classifyAll(sentences): AlethicAssertoric[]` — batch variant, drops non-assertoric.

**`FormalAnnotator`** — extracts logical features and attaches a constituency syntax tree.

- Trigger tables for connectives, quantifiers, modal adverbs, and negations (span-based, non-overlapping).
- Proposition extraction: inverts the occupied spans to find free text fragments.
- `annotate(sentence): AnnotatedSentence` — populates `features` and `syntaxTree`.
- `annotateAll(sentences): AnnotatedSentence[]` — batch variant.

**`ArgumentAnalyser`** — detects argument structure.

- Conclusion markers: `therefore`, `thus`, `hence`, `consequently`, etc.
- Premise markers: `because`, `since`, `given that`, etc.
- When no explicit conclusion is found, the last sentence is promoted.
- Pairwise relations: `supports`, `opposes` (negation asymmetry + content-word overlap), or `independent`.
- `analyse(sentences): AnalysedArgument`

**`FormalTranslator`** — generates formula strings for all three formal languages.

- **Propositional**: interleaves proposition labels with connective operators → `"p -> q"`.
- **Quantificational**: prefixes with detected quantifier → `"∀x. p -> q"`.
- **Modal**: wraps with modal operator → `"□(p -> q)"`.
- `translate(source, annotated): FormalTranslationSet`

**`NLPEngine`** — top-level orchestrator.

- `parse(input: string): NLPResult` — runs the full pipeline over a string.
- `parseStream(source: AsyncIterable<string>): Promise<NLPResult>` — async variant for file/stream input.

### `NLPResult` shape

```ts
interface NLPResult {
  input: string;
  candidates: AlethicAssertoric[];
  sentenceSet: SentenceSet;
  annotated: AnnotatedSentence[];   // includes syntaxTree per sentence
  argument: AnalysedArgument;
  translations: FormalTranslationSet;
}
```

## Syntax Engine — What's Implemented

### Constituency parse trees (`src/engine/syntax/`)

**`syntaxTypes.ts`** — serialization-ready DTOs designed for future protobuf/JSON/CBOR support:

| Type | Role |
| --- | --- |
| `PhraseLabel` | Constituent categories: `S`, `NP`, `VP`, `PP`, `AP`, `AdvP`, `CP`, `QP` |
| `POSTag` | POS tags: `DET`, `QUANT`, `N`, `PN`, `PRON`, `V`, `COP`, `AUX`, `MODAL`, `ADJ`, `ADV`, `PREP`, `CONJ`, `COMP`, `NEG`, `PART`, `PUNCT`, `UNKNOWN` |
| `TaggedToken` | `{ text, pos, index }` — the pre-terminal layer |
| `TerminalNode` | Leaf: `{ kind: 'terminal', pos, text, index }` |
| `PhraseNode` | Internal: `{ kind: 'phrase', label, children, startIndex, endIndex }` |
| `SyntaxNode` | Discriminated union: `TerminalNode \| PhraseNode` |
| `SyntaxTree` | Root DTO: `{ schemaVersion, source, tokens, root }` |

The `kind` discriminator maps directly to a protobuf `oneof`. `PhraseLabel` and `POSTag` map to protobuf enums. Arrays (not Maps) are used throughout. `schemaVersion = '1'` enables forward-compatible evolution.

**`NaturalLanguageSyntaxParser`** — rule-based constituency parser.

- POS tagging via lexicon lookup with morphological heuristics (`-ly` → ADV, `-tion` → N, `-ous/-al/-ful/-ive/-able` → ADJ, `-ing` → V, etc.).
- Handles: simple declarative NP+VP, quantified NP (`QUANT N`), modal adverb opening (`AdvP`), conditional sentences (`if/then` → CP), copular constructions with PP, negation inside VP.
- `parse(sentence: string): SyntaxTree`

**`SyntaxTreePrinter`** — three rendering modes:

| Method | Output |
| --- | --- |
| `render(tree, header?)` | Box-drawing tree (`└─`, `├─`, `│`) |
| `renderTokens(tree)` | Flat indexed list: `[0] QUANT "All"` |
| `renderBracketed(tree)` | Inline bracketed notation: `[S [NP ...][VP ...]]` |
| `print/printTokens/printBracketed` | Console variants of each |

### Propositional formula parser (`src/engine/syntax/propositional/syntaxEngine.ts`)

**`PropositionalSyntaxEngine`** — recursive-descent parser for formula strings.

- Operator precedence (lowest → highest): `<->` < `->` < `|` < `&` < `~` < atoms/parentheses.
- `<->` and `->` are right-associative; `|` and `&` are left-associative.
- Double negation (`~~p`) is eliminated during parse by toggling `unaryOperator`.
- `parse(input: string): PropositionalParseResult` — returns `{ formula: WFF, variables: Map<string, PropositionalVariable> }`.
- `parseInto(input, variables)` — parses into a shared variable registry (used by `fromSentenceSet`).

**`PropositionalTheoryBuilder.fromSentenceSet(set: SentenceSet): PropositionalTheory`** — now implemented. Runs `FormalAnnotator` → `FormalTranslator` → `PropositionalSyntaxEngine` per sentence, sharing a single variable registry across all formulas.

## Semantics Engine — What's Implemented

**`PropositionalEvaluationEngine`** (`src/engine/semantics/propositional/evaluationEngine.ts`):

- `evaluate(formula, variables): EvaluationResult` — exhaustive 2^n enumeration.
- `evaluateString(formulaString): EvaluationResult` — parse + evaluate in one step.
- `classify(formulaString): WFFClassification` — `'tautology'` | `'contradiction'` | `'contingency'`.
- `truthTable(formulaString): TruthTable` — `{ variables, rows: { assignment, value }[] }`.
- `printTruthTable(formulaString): void` — formatted console output with box-drawing separator.

## What Is Not Yet Implemented

- Quantificational function symbols (e.g., `f(x)`)
- `QuantificationalSyntaxEngine` — parsing formula strings into QFF instances
- `QuantificationalTheoryBuilder.fromSentenceSet()` — awaits QuantificationalSyntaxEngine
- `ModalSyntaxEngine` — parsing formula strings into MFF instances
- `ModalTheoryBuilder.fromSentenceSet()` — awaits ModalSyntaxEngine
- Quantified modal logic (combining QFF quantifiers with modal operators)

## Conventions

- Every logical construct exposes `value(): boolean` — the evaluation contract.
- `AlethicAssertoric` is the universal sentence input type — always construct sentences through it, even when building theories manually (`confidence: 1.0`).
- Tests exhaustively cover every row of each operator's truth table.
- New language modules follow the `propositional/` pattern: types file, implementations, utils, builder, variable, theory, theory-builder, `index.ts`, matching `test/language/<name>/` directory.
- Skipped tests (`test.skip`) mark planned work — they should describe intended behaviour before implementation begins.
