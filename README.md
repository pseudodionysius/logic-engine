# Logic Engine

A TypeScript library providing types and runtime evaluation for formal logical languages. Use it to build proof systems, formalise natural language processing pipelines, or explore the theory and limits of formal logic.

## Install

```bash
npm install logic-engine
```

## How it works

The engine has two layers:

1. **Language modules** — define the syntax and semantics of a formal language (propositional, quantificational, modal, …). Each language exposes formula types, a `value(): boolean` evaluation contract, and a theory data structure for reasoning over sets of sentences.
2. **Engine modules** — process input. The NLP engine identifies assertoric sentence candidates in natural language; syntax and evaluation engines formalise and reason about them.

The universal sentence input type is `AlethicAssertoric` — a validated declarative sentence with a confidence score. It flows from the NLP engine into formal language parsers.

```ts
interface AlethicAssertoric {
  raw: string;        // the natural language sentence
  confidence: number; // 0–1; use 1.0 for manually constructed sentences
}

interface SentenceSet {
  sentences: AlethicAssertoric[];
}
```

All formal language formula types implement the shared `Formula` interface:

```ts
interface Formula {
  value: () => boolean;
}
```

## Languages

### Propositional Logic

Classical propositional (sentential) logic. The foundational language of the engine.

#### `WFF` — Well Formed Formula

Every sentence is a `WFF`, which is either an `Atom` or a `Complex`.

#### `Atom`

The smallest truth-evaluable unit:

```ts
interface Atom extends Formula {
  unaryOperator: '~' | undefined;
  proposition?: boolean | (() => boolean);
  value: () => boolean;
}
```

`proposition` can be a boolean literal or a `() => boolean` thunk. The only unary operator is `'~'` (negation).

```ts
const t = new AtomImpl(undefined, true);               // value() → true
const f = new AtomImpl('~', true);                     // value() → false (negated)
const e = new AtomImpl(undefined, () => 2 + 2 === 4);  // value() → true
```

#### `Complex`

A composite formula joining two `WFF`s with a binary operator:

```ts
interface Complex extends Formula {
  unaryOperator: '~' | undefined;
  left?: WFF;
  binaryOperator?: '&' | '|' | '->' | '<->';
  right?: WFF;
  value: () => boolean;
}
```

```ts
const p = new AtomImpl(undefined, true);
const q = new AtomImpl(undefined, false);

const pAndQ = new ComplexImpl(undefined, p, '&', q); // value() → false
const pOrQ  = new ComplexImpl(undefined, p, '|', q); // value() → true
```

#### Binary Operators

| Operator | Name | `(T, F)` | `(F, T)` | `(F, F)` |
| --- | --- | --- | --- | --- |
| `&` | AND | F | F | F |
| `\|` | OR | T | T | F |
| `->` | Material Implication | F | T | T |
| `<->` | Biconditional | F | F | T |

#### `PropositionalVariable`

A named variable with a mutable truth value. All atoms derived from it share the same underlying value via closure — assigning the variable updates every derived atom simultaneously. Use this when building theories where multiple formulas reference the same proposition.

```ts
const p = new PropositionalVariable('p');
const pAtom    = p.atom();       // reads p's current value
const notPAtom = p.atom(true);   // reads ~p

p.assign(true);
pAtom.value()    // → true
notPAtom.value() // → false
```

#### `PropositionalTheory` and `PropositionalTheoryBuilder`

A `PropositionalTheory` is a finite set of formalised sentences derived from `AlethicAssertoric` inputs. It supports consistency checking, structured proof output, and a logical relations graph.

Build one with `PropositionalTheoryBuilder`:

```ts
const builder = new PropositionalTheoryBuilder();
const p = builder.variable('p');
const q = builder.variable('q');

builder
  .sentence(
    { raw: 'It is raining',           confidence: 1.0 },
    p.atom(),
    ['p'],
  )
  .sentence(
    { raw: 'If it rains, the ground is wet', confidence: 1.0 },
    new ComplexImpl(undefined, p.atom(), '->', q.atom()),
    ['p', 'q'],
  )
  .sentence(
    { raw: 'The ground is wet',       confidence: 1.0 },
    q.atom(),
    ['q'],
  );

const theory = builder.build();
```

**Check consistency:**

```ts
const result = theory.checkConsistency();
// result.isConsistent → true
// result.witness      → { p: true, q: true }
```

**Print a proof tree:**

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

**Print a logical relations graph:**

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

**Inconsistency example:**

```ts
const builder = new PropositionalTheoryBuilder();
const p = builder.variable('p');
builder
  .sentence({ raw: 'p',  confidence: 1.0 }, p.atom(),      ['p'])
  .sentence({ raw: '~p', confidence: 1.0 }, p.atom(true),  ['p']);

builder.build().printProof();
```

```text
CONSISTENCY PROOF — Propositional Logic
══════════════════════════════════════════
INCONSISTENT ✗
├── Theory: 2 sentence(s), 1 variable(s) {p}
├── Method: exhaustive evaluation, 2^1 = 2 valuations checked
└── No satisfying valuation exists. Exhaustion:
    ├── {p=F}  →  φ1 fails
    └── {p=T}  →  φ2 fails
```

#### `WFFBuilder`

Factory that constructs the correct type from an input object (useful when deserialising):

```ts
const builder = new WFFBuilder();
const wff = builder.getWFF({ unaryOperator: undefined, proposition: true });
```

### Quantificational Logic

> In Progress

Extends propositional logic with universal (`∀`) and existential (`∃`) quantifiers, predicate symbols, and individual variables.

### Modal Logic

> In Progress

Extends propositional logic with operators for necessity (`□`) and possibility (`◇`), evaluated over possible-worlds semantics.

## NLP Engine

> In Progress

`NLPEngine.parse(input)` accepts any string and returns an `NLPResult` containing zero or more `AlethicAssertoric` candidates — declarative sentences that make a truth claim. The candidates can be passed as a `SentenceSet` to `PropositionalTheoryBuilder.fromSentenceSet()` once the syntax engine is implemented.

## Syntax Engine

> In Progress

`PropositionalSyntaxEngine` will parse formula strings and JSON into typed `WFF` instances, enabling `PropositionalTheoryBuilder.fromSentenceSet()` to accept NLP engine output directly.

## Evaluation Engine

> In Progress

`PropositionalEvaluationEngine` will provide truth table generation, tautology / contradiction / contingency classification, and proof support beyond the truth-table consistency check already available in `PropositionalTheory`.

## License

This project is open source and licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
