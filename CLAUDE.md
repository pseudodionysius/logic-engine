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
      index.ts                                       # TODO
  engine/
    nlp/
      nlpTypes.ts                                    # NLPResult (imports AlethicAssertoric from shared)
      nlpEngine.ts                                   # NLPEngine stub
      index.ts
    syntax/
      propositional/syntaxEngine.ts                  # TODO
    semantics/
      propositional/evaluationEngine.ts              # TODO

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
  engine/
    nlp/nlpEngine.spec.ts                            # Skipped placeholder
    syntax/propositional/syntaxEngine.spec.ts        # Skipped placeholder
    semantics/propositional/evaluationEngine.spec.ts # Skipped placeholder
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

## NLP Engine — Design Intent

`NLPEngine.parse(input: string): NLPResult` accepts any string and returns zero or more `AlethicAssertoric` candidates. The output `SentenceSet` feeds directly into `PropositionalTheoryBuilder.fromSentenceSet()`.

## What Is Not Yet Implemented

- `NLPEngine` — sentence segmentation, mood classification, confidence scoring
- `PropositionalSyntaxEngine` — parsing formula strings into WFF instances
- `PropositionalEvaluationEngine` — truth tables, tautology/contradiction classification
- `PropositionalTheoryBuilder.fromSentenceSet()` — awaits SyntaxEngine
- Quantificational function symbols (e.g., `f(x)`)
- `QuantificationalSyntaxEngine` — parsing formula strings into QFF instances
- `QuantificationalTheoryBuilder.fromSentenceSet()` — awaits SyntaxEngine
- `Modal` language module

## Conventions

- Every logical construct exposes `value(): boolean` — the evaluation contract.
- `AlethicAssertoric` is the universal sentence input type — always construct sentences through it, even when building theories manually (`confidence: 1.0`).
- Tests exhaustively cover every row of each operator's truth table.
- New language modules follow the `propositional/` pattern: types file, implementations, utils, builder, variable, theory, theory-builder, `index.ts`, matching `test/language/<name>/` directory.
- Skipped tests (`test.skip`) mark planned work — they should describe intended behaviour before implementation begins.
