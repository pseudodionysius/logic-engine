# Propositional Logic

Classical propositional logic implemented in TypeScript.

## Overview

Propositional logic (also called sentential or zeroth-order logic) is the foundational formal language of this engine. It provides truth-evaluable formulae built from atomic propositions connected by logical operators, a named-variable system for building theories over shared propositions, and a theory data structure for reasoning over sets of assertoric sentences.

All formula types implement the shared `Formula` interface (`src/language/shared/types.ts`):

```ts
interface Formula {
  value: () => boolean;
}
```

## Input type

All formal language engines accept `AlethicAssertoric` sentences — validated declarative sentences with a confidence score (`src/language/shared/types.ts`):

```ts
interface AlethicAssertoric {
  raw: string;        // the natural language sentence
  confidence: number; // 0–1; use 1.0 for manually constructed sentences
}
```

A `SentenceSet` is an ordered collection of these, used as the unit of input when passing NLP engine output to a formal language engine.

## Formula types

Defined in `propositionalTypes.d.ts`:

- `UnaryOperator` — `'~'` (negation / NOT)
- `BinaryOperator` — `'&'` | `'|'` | `'->'` | `'<->'`
- `Atom` — smallest truth-evaluable unit; holds a proposition (boolean or thunk) and an optional unary operator
- `Complex` — composite formula; joins two `WFF`s with a binary operator and an optional unary operator
- `WFF` (Well Formed Formula) — the union type; any valid propositional expression

## Implementations

### `AtomImpl`

```ts
new AtomImpl(unaryOperator, proposition)
```

`proposition` may be a `boolean` literal or a `() => boolean` thunk. `value()` evaluates the proposition, then applies `'~'` negation if present.

### `ComplexImpl`

```ts
new ComplexImpl(unaryOperator, left, binaryOperator, right)
```

`value()` combines `left.value()` and `right.value()` using the binary operator semantics, then applies `'~'` to the whole if present.

### `WFFBuilder`

Factory that inspects an input object and returns the correctly typed `AtomImpl` or `ComplexImpl`.

## Named variables — `PropositionalVariable`

For building theories where multiple formulas share the same proposition, use `PropositionalVariable` instead of raw booleans. All atoms created from a variable share its value via closure:

```ts
const p = new PropositionalVariable('p');
const pAtom    = p.atom();       // reads p's current value
const notPAtom = p.atom(true);   // reads ~p

p.assign(true);
pAtom.value()    // → true
notPAtom.value() // → false
```

Changing the variable after deriving atoms updates all of them — this is the mechanism used by `PropositionalTheory` for exhaustive truth-table evaluation.

## Theory data structure — `PropositionalTheory`

A `PropositionalTheory` is a finite set of `PropositionalFormalSentence` records, each pairing an `AlethicAssertoric` source with a `WFF` formula and the list of variable names it depends on.

Build one using `PropositionalTheoryBuilder`:

```ts
const builder = new PropositionalTheoryBuilder();
const p = builder.variable('p');
const q = builder.variable('q');

builder
  .sentence(
    { raw: 'It is raining',                  confidence: 1.0 },
    p.atom(),
    ['p'],
  )
  .sentence(
    { raw: 'If it rains, the ground is wet', confidence: 1.0 },
    new ComplexImpl(undefined, p.atom(), '->', q.atom()),
    ['p', 'q'],
  )
  .sentence(
    { raw: 'The ground is wet',              confidence: 1.0 },
    q.atom(),
    ['q'],
  );

const theory = builder.build();
```

### Consistency checking

```ts
const result = theory.checkConsistency();
// { isConsistent: true, witness: { p: true, q: true } }
```

`checkConsistency()` performs exhaustive truth-table evaluation over all `2^n` variable assignments (where `n` is the number of declared variables). Returns a `ConsistencyResult`:

- **Consistent** — `isConsistent: true`, `witness` carries a satisfying variable assignment
- **Inconsistent** — `isConsistent: false`, `failedValuations` records, for every assignment, which sentence first failed

### Proof tree

```ts
theory.printProof();
```

```text
CONSISTENCY PROOF — Propositional Logic
══════════════════════════════════════════
CONSISTENT ✓
├── Theory: 3 sentence(s), 2 variable(s) {p, q}
├── Method: exhaustive evaluation, 2^2 = 4 valuations checked
├── Satisfying valuation: {p=T, q=T}
└── Verification:
    ├── φ1  ✓  "It is raining"
    ├── φ2  ✓  "If it rains, the ground is wet"
    └── φ3  ✓  "The ground is wet"
```

```text
INCONSISTENT ✗
├── Theory: 2 sentence(s), 1 variable(s) {p}
├── Method: exhaustive evaluation, 2^1 = 2 valuations checked
└── No satisfying valuation exists. Exhaustion:
    ├── {p=F}  →  φ1 fails
    └── {p=T}  →  φ2 fails
```

Use `buildProofTree()` to get the structured `ProofNode` tree without printing.

### Logical relations graph

```ts
theory.printGraph();
```

```text
LOGICAL RELATIONS GRAPH — Propositional Logic
════════════════════════════════════════════════
Sentences:
  φ1    "It is raining"                  [p]
  φ2    "If it rains, the ground is wet" [p, q]
  φ3    "The ground is wet"              [q]

Pairwise relations:
  φ1  ↔  φ2   consistent  (can both be true)
  φ1  ↔  φ3   consistent  (can both be true)
  φ2  ↔  φ3   ENTAILS  (φ2 ⊨ φ3)

Shared variables:
  p:  φ1 — φ2
  q:  φ2 — φ3
```

Pairwise relations computed: `INCONSISTENT` | `EQUIVALENT` | `ENTAILS` (left or right) | `consistent`.

### Future: `fromSentenceSet()`

`PropositionalTheoryBuilder.fromSentenceSet(set: SentenceSet)` is a typed stub. Once `PropositionalSyntaxEngine` is implemented it will accept `SentenceSet` output from `NLPEngine` directly and parse each `AlethicAssertoric` into a `WFF` automatically.

## Binary Operator Truth Tables

### AND `&`

| P | Q | P & Q |
| --- | --- | --- |
| T | T | T |
| T | F | F |
| F | T | F |
| F | F | F |

### OR `|`

| P | Q | P \| Q |
| --- | --- | --- |
| T | T | T |
| T | F | T |
| F | T | T |
| F | F | F |

### Material Implication `->`

| P | Q | P -> Q |
| --- | --- | --- |
| T | T | T |
| T | F | F |
| F | T | T |
| F | F | T |

### Biconditional `<->`

| P | Q | P <-> Q |
| --- | --- | --- |
| T | T | T |
| T | F | F |
| F | T | F |
| F | F | T |

## Meta-logic

The `test/language/propositional/meta-logic/` directory contains proven properties of this implementation:

- **Expressive adequacy** — inductive proof that `{~, &, |}` is expressively adequate; Shannon expansion is the inductive step; all 16 binary truth functions verified via DNF
- **Completeness** — structural induction proof that `value()` is semantically correct at every level; known tautologies, contradictions, and contingencies are classified correctly by the truth-table method

## Planned

- `PropositionalSyntaxEngine` — parse formula strings and JSON into `WFF` instances
- `PropositionalEvaluationEngine` — truth table generation, tautology/contradiction/contingency classification beyond consistency checking
