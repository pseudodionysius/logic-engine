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

First-order quantificational logic (predicate logic) over finite domains. Extends propositional logic with universal (`∀`) and existential (`∃`) quantifiers, predicate symbols, and individual terms.

#### Terms

The objects logic talks about. A `Term` is either a `ConstantTerm` or a `VariableTerm`.

- **`ConstantTerm`**: A fixed individual (e.g., "Socrates", "42"). Resolves to the same element regardless of any variable assignment.
- **`VariableTerm`**: A placeholder (e.g., "x", "y"). Resolves to its currently assigned domain element.

```ts
const a = new ConstantTerm('socrates');
const x = new VariableTerm('x');
```

#### Predicates

Relations over domain elements. A `PredicateImpl` has a name, arity (number of arguments), and an interpretation function.

```ts
// Unary: Mortal(x)
const Mortal = new PredicateImpl('Mortal', 1, (x) => mortalSet.has(x));

// Binary: Loves(x, y)
const Loves = new PredicateImpl('Loves', 2, (x, y) => x === 'socrates' && y === 'plato');
```

**`IDENTITY` (=)**: A built-in binary predicate that holds if and only if its two arguments are the exact same domain element.

```ts
import { IDENTITY } from 'logic-engine';
// IDENTITY.holds('a', 'a') → true
```

#### Formulas (`QFF`)

- **`AtomicFormulaImpl`**: A predicate applied to the required number of terms (e.g., `Mortal(socrates)`).
- **`ComplexFormulaImpl`**: Two `QFF`s joined by binary connectives (`&`, `|`, `->`, `<->`).
- **`QuantifiedFormulaImpl`**: A `QFF` bound by a quantifier (`∀` or `∃`) over a variable name and a finite domain.

```ts
// ∀x.Mortal(x)
const forallMortal = new QuantifiedFormulaImpl(
  undefined, '∀', 'x', 
  new AtomicFormulaImpl(undefined, Mortal, [new VariableTerm('x')], assignment), 
  ['socrates', 'plato'], 
  assignment
);
```

#### `QuantificationalTheory` and `QuantificationalTheoryBuilder`

Manages a set of formalised sentences and provides consistency checking over a **finite domain**.

```ts
const builder = new QuantificationalTheoryBuilder();
builder.domain('socrates', 'plato', 'aristotle');

const x = builder.variable('x');
const Man = builder.predicate('Man', 1, (x) => x === 'socrates');
const Mortal = builder.predicate('Mortal', 1, (x) => x === 'socrates');

// φ1: ∀x.(Man(x) -> Mortal(x))
const manX = new AtomicFormulaImpl(undefined, Man, [x.term()], builder.assignment);
const mortalX = new AtomicFormulaImpl(undefined, Mortal, [x.term()], builder.assignment);
const impl = new ComplexFormulaImpl(undefined, manX, '->', mortalX);

builder.sentence(
  { raw: 'All men are mortal', confidence: 1.0 },
  new QuantifiedFormulaImpl(undefined, '∀', 'x', impl, builder.currentDomain, builder.assignment),
  ['x']
);

// φ2: Man(socrates)
builder.sentence(
  { raw: 'Socrates is a man', confidence: 1.0 },
  new AtomicFormulaImpl(undefined, Man, [new ConstantTerm('socrates')], builder.assignment),
  []
);

const theory = builder.build();
const result = theory.checkConsistency();
// result.isConsistent → true
```

Consistency is decided by exhaustive evaluation over all $|D|^n$ variable assignments (where $D$ is the domain and $n$ is the number of free variables).

#### Proofs and Graphs

`QuantificationalTheory` supports the same structured output as propositional logic:

- **`theory.printProof()`**: Shows the exhaustive check and first failure or satisfying witness.
- **`theory.printGraph()`**: Maps relations between sentences (entailment, equivalence, inconsistency).


### Modal Logic

Extends propositional logic with operators for necessity (`□`) and possibility (`◇`), evaluated over possible-worlds (Kripke) semantics. A **Kripke model** is a triple (W, R, V) where W is a finite set of worlds, R is an accessibility relation on W, and V assigns each proposition a set of worlds where it is true. Truth is always evaluated relative to a world.

```text
M, w ⊨ □φ   iff  for all w' with wRw', M, w' ⊨ φ
M, w ⊨ ◇φ   iff  there exists w' with wRw' such that M, w' ⊨ φ
```

#### `MFF` — Modal Well-Formed Formula

Every modal expression is an `MFF`. All formula types satisfy `Formula` and expose `value(): boolean` evaluated at the current world in the shared model state.

```ts
interface MFF extends Formula {
  unaryOperator: '~' | undefined;
  value(): boolean;
}
```

#### `ModalAtomImpl`

A proposition letter. Its truth value varies by world, read from the shared valuation at the current world.

```ts
const state: ModalEvaluationState = { currentWorld: 'w0', valuation: new Map() };

state.valuation.set('p', new Set(['w0', 'w1']));
const p = new ModalAtomImpl(undefined, 'p', state);

p.value()  // → true  (w0 ∈ extension of p)
state.currentWorld = 'w2';
p.value()  // → false (w2 ∉ extension of p)
```

#### `ModalComplexImpl`

Two `MFF`s joined by a binary connective. Evaluated at the current world with the same truth-functional semantics as propositional logic.

```ts
const conj = new ModalComplexImpl(undefined, p, '&', q);
const impl = new ModalComplexImpl(undefined, p, '->', q);
```

#### `ModalFormulaImpl`

A necessity or possibility claim. Iterates over accessible worlds from the current world, exactly as a quantifier iterates over domain elements.

```ts
// □p: true at w iff p is true at every world accessible from w
const boxP = new ModalFormulaImpl(undefined, '□', p, worlds, accessibility, state);

// ◇p: true at w iff p is true at some world accessible from w
const diaP = new ModalFormulaImpl(undefined, '◇', p, worlds, accessibility, state);
```

**`□` is vacuously true when no worlds are accessible.** This means `□p & ~p` is consistent in System K — the designated world need not access itself.

Nesting works naturally since `ModalFormulaImpl` is itself an `MFF`:

```ts
// □□p — necessarily necessarily p
const boxBoxP = new ModalFormulaImpl(undefined, '□', boxP, worlds, accessibility, state);
```

#### `ModalVariable`

A named proposition letter that creates atoms sharing the same evaluation state. Analogous to `PropositionalVariable`.

```ts
const p = new ModalVariable('p', state);
const pAtom    = p.atom();      // ModalAtomImpl for p
const notPAtom = p.atom(true);  // ModalAtomImpl for ~p
```

#### Modal Systems

A `ModalSystemSpec` encapsulates a system's name and its frame validation logic. The language layer (formula evaluation) is system-agnostic — the system only influences which frames are accepted on `build()` and how output is labelled.

```ts
interface ModalSystemSpec {
  readonly name: string;
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void;
}
```

Five systems are provided out of the box:

| Export | System | Frame condition | Key non-theorem |
| --- | --- | --- | --- |
| `SystemK` | K | None (any frame) | □p → p |
| `SystemT` | T | Reflexive: wRw | □p → □□p |
| `SystemD` | D | Serial: ∀w.∃w'.wRw' | □p → p |
| `SystemS4` | S4 | Reflexive + Transitive | ◇p → □◇p |
| `SystemS5` | S5 | Reflexive + Transitive + Symmetric | — |

`build()` calls `validateFrame()` and throws a descriptive error if the frame does not satisfy the chosen system's conditions:

```ts
new ModalTheoryBuilder()
  .system(SystemT)
  .worlds('w0', 'w1')
  .accessibility((f, t) => f === 'w0' && t === 'w1') // w1 has no self-loop
  .designatedWorld('w0')
  .build();
// Error: System T requires a reflexive frame: world 'w1' does not access itself.
```

Custom systems are first-class — implement `ModalSystemSpec` and pass it to `.system()`.

#### `ModalTheory` and `ModalTheoryBuilder`

Build a modal theory with `ModalTheoryBuilder`. The default system is `SystemK`.

```ts
const builder = new ModalTheoryBuilder();
builder
  .system(SystemK)
  .worlds('actual', 'possible')
  .accessibility((f, t) => f === 'actual' && t === 'possible')
  .designatedWorld('actual');

const p = builder.proposition('p');

// □p — it necessarily rains (p must be true at 'possible')
const boxP = new ModalFormulaImpl(
  undefined, '□', p.atom(),
  builder.currentWorlds, builder.currentAccessibility, builder.state,
);

// ◇p — it possibly rains (p is true at some accessible world)
const diaP = new ModalFormulaImpl(
  undefined, '◇', p.atom(),
  builder.currentWorlds, builder.currentAccessibility, builder.state,
);

builder
  .sentence({ raw: 'Necessarily it rains', confidence: 1.0 }, boxP, ['p'])
  .sentence({ raw: 'Possibly it rains',    confidence: 1.0 }, diaP, ['p']);

const theory = builder.build();
```

**Check consistency:**

```ts
const result = theory.checkConsistency();
// result.isConsistent → true
// result.witness      → { 'p@actual': false, 'p@possible': true }
```

Consistency is decided by exhaustive enumeration of all 2^(|P|×|W|) valuations (P = proposition letters, W = worlds). The witness is keyed as `prop@world`.

**Print a proof tree:**

```ts
theory.printProof();
```

```text
CONSISTENCY PROOF — Modal Logic (System K)
═════════════════════════════════════════════
CONSISTENT ✓
├── Theory: 2 sentence(s), 1 proposition(s) {p}, 2 world(s) {actual, possible}
├── Kripke frame:
│   ├── Worlds: {actual, possible}
│   ├── Accessibility: {actualRpossible}
│   └── Designated world: actual
├── Method: exhaustive evaluation, 2^(1×2) = 4 valuations checked
├── Per-world valuation:
│   ├── actual:   {p=false}
│   └── possible: {p=true}
└── Verification (at designated world):
    ├── φ1  ✓  "Necessarily it rains"
    └── φ2  ✓  "Possibly it rains"
```

**Print a logical relations graph:**

```ts
theory.printGraph();
```

```text
LOGICAL RELATIONS GRAPH — Modal Logic (System K)
═══════════════════════════════════════════════════

Frame: 2 world(s), designated: actual

Sentences:
  φ1    "Necessarily it rains"  [p]
  φ2    "Possibly it rains"     [p]

Pairwise relations:
  φ1  ↔  φ2   ENTAILS  (φ1 ⊨ φ2)

Shared propositions:
  p:  φ1 — φ2
```

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
