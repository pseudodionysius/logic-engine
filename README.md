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

`NLPEngine.parse(input)` accepts any string and returns an `NLPResult`. All processing is rule-based — no external ML dependencies.

```ts
import { NLPEngine } from 'logic-engine';

const engine = new NLPEngine();
const result = engine.parse(
  'All men are mortal. Socrates is a man. Therefore Socrates is mortal.',
);

// result.candidates   — AlethicAssertoric[] (assertoric sentences only)
// result.sentenceSet  — SentenceSet ready for PropositionalTheoryBuilder.fromSentenceSet()
// result.annotated    — features + constituency syntax tree per sentence
// result.argument     — { premises, conclusions, relations }
// result.translations — propositional / quantificational / modal formula strings
```

**Stream support** — pass any `AsyncIterable<string>` for file or network input:

```ts
const result = await engine.parseStream(fs.createReadStream('argument.txt', 'utf-8'));
```

### Pipeline stages

| Stage | Class | Responsibility |
| --- | --- | --- |
| 1 | `TextSegmenter` | Sentence boundary detection — respects abbreviations and decimals |
| 2 | `SentenceClassifier` | Mood detection; confidence scoring (0.05–1.0) |
| 3 | `FormalAnnotator` | Extracts connectives, quantifiers, modals, negations, propositions; builds syntax tree |
| 4 | `ArgumentAnalyser` | Identifies premises and conclusions; computes pairwise relations |
| 5 | `FormalTranslator` | Generates formula strings for propositional, quantificational, and modal languages |

### `AnnotatedSentence`

Each sentence in `result.annotated` carries:

```ts
interface AnnotatedSentence {
  source: AlethicAssertoric;
  features: SentenceFeatures;   // connectives, quantifiers, modalAdverbs, negations, propositions, mood
  syntaxTree: SyntaxTree;       // constituency parse tree
}
```

### Formal translations

`result.translations` contains formula strings for all three languages:

```ts
// e.g. for "If it rains then the streets are wet"
propositional:     { formulaString: 'p -> q', propositionMap: { p: 'it rains', q: 'the streets are wet' } }
quantificational:  { formulaString: '∀x. p -> q', quantifierPrefix: null, suggestedPredicate: null }
modal:             { formulaString: 'p -> q', modalPrefix: null }
```

## Syntax Engine

### Constituency syntax trees

`NaturalLanguageSyntaxParser` builds a constituency parse tree for any sentence. Trees are serialization-ready DTOs — no methods, plain data, compatible with JSON/protobuf/CBOR.

```ts
import { NaturalLanguageSyntaxParser, SyntaxTreePrinter } from 'logic-engine';

const parser  = new NaturalLanguageSyntaxParser();
const printer = new SyntaxTreePrinter();

const tree = parser.parse('All men are mortal.');

printer.print(tree);          // box-drawing tree
printer.printTokens(tree);    // flat POS-tagged token list
printer.printBracketed(tree); // [S [NP [QUANT All][N men]][VP [COP are][AP [ADJ mortal]]]]
```

Box-drawing output example:

```text
Syntax Tree — "All men are mortal."
══════════════════════════════════════
S
├── NP
│   ├── QUANT  "All"
│   └── N      "men"
└── VP
    ├── COP    "are"
    └── AP
        └── ADJ    "mortal"
```

**`SyntaxTree` DTO** — self-contained and schema-versioned:

```ts
interface SyntaxTree {
  schemaVersion: string;   // '1' — bump on breaking shape changes
  source: string;          // original sentence
  tokens: TaggedToken[];   // POS-tagged token sequence
  root: PhraseNode;        // root S node
}
```

Node types use a `kind` discriminator (`'terminal'` | `'phrase'`) that maps directly to a protobuf `oneof`. Phrase labels (`S`, `NP`, `VP`, `PP`, `AP`, `AdvP`, `CP`, `QP`) and POS tags map to protobuf enums.

### Propositional formula parser

`PropositionalSyntaxEngine` parses formula strings into typed `WFF` instances.

```ts
import { PropositionalSyntaxEngine } from 'logic-engine';

const engine = new PropositionalSyntaxEngine();

const { formula, variables } = engine.parse('p -> (q | ~p)');
// formula   — a WFF ready for value() evaluation
// variables — Map<string, PropositionalVariable>

variables.get('p')!.assign(true);
variables.get('q')!.assign(false);
formula.value(); // → true
```

Operator precedence (lowest → highest): `<->` < `->` < `|` < `&` < `~`. Double negation (`~~p`) is eliminated during parse. Parentheses override precedence as expected.

**`PropositionalTheoryBuilder.fromSentenceSet()`** uses the syntax engine internally — pass `NLPEngine` output directly into a propositional theory:

```ts
const nlp    = new NLPEngine();
const result = nlp.parse('It is raining. If it rains the ground is wet. The ground is wet.');

const theory = new PropositionalTheoryBuilder().fromSentenceSet(result.sentenceSet);
theory.printProof();
```

## Dialectical Map

`DialecticalMap` organises an unbounded collection of structured `Argument` entities around a central `ContentiousClaim` and formally evaluates each argument's inferential relationship to the claim and to every other argument.

Unlike `ArgumentAnalyser` (which works over flat sentence lists), the dialectical map treats each argument as an independent unit with its own internal premise → conclusion structure and an explicit target.

### Core types

```ts
interface ContentiousClaim {
  claim: AlethicAssertoric;
  label: string;
}

interface Argument {
  id: string;
  label: string;
  premises: AlethicAssertoric[];
  subConclusion: AlethicAssertoric;
  target: ArgumentTarget;   // { kind: 'claim' } | { kind: 'argument', argumentId } | { kind: 'premise', argumentId, premiseIndex }
  stance: ArgumentStance;   // 'supports' | 'attacks' | 'qualifies' | 'undermines' | 'concedes'
}
```

### Building a dialectical map

```ts
import { DialecticalMapBuilder } from 'logic-engine';

const map = new DialecticalMapBuilder()
  .claim({ raw: 'Capital punishment is justified', confidence: 1.0 }, 'Central Claim')
  .argument({
    id: 'deterrence',
    label: 'The Deterrence Argument',
    premises: [
      { raw: 'Capital punishment deters violent crime', confidence: 0.8 },
      { raw: 'Deterring crime saves innocent lives',    confidence: 0.9 },
    ],
    subConclusion: { raw: 'Capital punishment saves innocent lives', confidence: 0.85 },
    target: { kind: 'claim' },
    stance: 'supports',
  })
  .argument({
    id: 'irreversibility',
    label: 'The Irreversibility Objection',
    premises: [
      { raw: 'Wrongful executions cannot be undone', confidence: 0.95 },
      { raw: 'The justice system makes errors',      confidence: 0.90 },
    ],
    subConclusion: { raw: 'Capital punishment risks irreversible injustice', confidence: 0.85 },
    target: { kind: 'claim' },
    stance: 'attacks',
  })
  .argument({
    id: 'rebuttal',
    label: 'Rebuttal to Deterrence',
    premises: [
      { raw: 'Empirical studies show no deterrent effect', confidence: 0.75 },
    ],
    subConclusion: { raw: 'The deterrence premise is false', confidence: 0.70 },
    target: { kind: 'premise', argumentId: 'deterrence', premiseIndex: 0 },
    stance: 'undermines',
  })
  .build();
```

Arguments can target the central claim, another argument's sub-conclusion, or a specific premise within another argument.

### Evaluating

```ts
const result = map.evaluate();
```

`evaluate()` returns a `DialecticalMapResult`:

```ts
interface DialecticalMapResult {
  claim: ContentiousClaim;
  arguments: Argument[];
  evaluations: ArgumentEvaluation[];   // one per argument
  tensions: ArgumentTension[];         // C(n,2) pairwise pairs
}
```

Each `ArgumentEvaluation` contains:

```ts
interface ArgumentEvaluation {
  argumentId: string;
  internalValidity: EntailmentStrength;  // 'valid' | 'consistent' | 'inconsistent' | 'undetermined'
  claimRelation: ClaimRelation;          // 'entails' | 'entailed-by' | 'equivalent' | 'contradicts' | 'consistent' | 'undetermined'
  strength: number;                      // avg(premise.confidence) × validity weight ∈ [0, 1]
}
```

- **`internalValidity`** — whether the argument's premise-conjunction formally entails its sub-conclusion (`valid`), is consistent with it, or inconsistent.
- **`claimRelation`** — how the sub-conclusion relates to the central claim under propositional evaluation.
- **`strength`** — `avg(premise.confidence) × weight` where `weight` is `1.0` (valid), `0.5` (consistent), or `0.0` (otherwise).

Each `ArgumentTension` gives the pairwise formal relation between two arguments' sub-conclusions:

```ts
interface ArgumentTension {
  argumentIdA: string;
  argumentIdB: string;
  conclusionRelation: PairwiseRelation;  // 'INCONSISTENT' | 'EQUIVALENT' | 'ENTAILS_LEFT' | 'ENTAILS_RIGHT' | 'CONSISTENT'
}
```

### Printing a report

```ts
map.printReport();
```

```text
DIALECTICAL MAP REPORT
══════════════════════════════════════════════════

Central Claim [Central Claim]
  "Capital punishment is justified"
  confidence: 1.00

Arguments (3):

  [deterrence] The Deterrence Argument  (supports → claim)
  Premises:
    • "Capital punishment deters violent crime"  (confidence: 0.80)
    • "Deterring crime saves innocent lives"  (confidence: 0.90)
  Sub-conclusion: "Capital punishment saves innocent lives"
  Validity: consistent     Claim relation: consistent       Strength: 0.425

  [irreversibility] The Irreversibility Objection  (attacks → claim)
  Premises:
    • "Wrongful executions cannot be undone"  (confidence: 0.95)
    • "The justice system makes errors"  (confidence: 0.90)
  Sub-conclusion: "Capital punishment risks irreversible injustice"
  Validity: consistent     Claim relation: consistent       Strength: 0.463

  [rebuttal] Rebuttal to Deterrence  (undermines → premise[0] of deterrence)
  Premises:
    • "Empirical studies show no deterrent effect"  (confidence: 0.75)
  Sub-conclusion: "The deterrence premise is false"
  Validity: consistent     Claim relation: consistent       Strength: 0.375

Pairwise tensions (sub-conclusions):
  The Deterrence Argument  ↔  The Irreversibility Objection   consistent
  The Deterrence Argument  ↔  Rebuttal to Deterrence   consistent
  The Irreversibility Objection  ↔  Rebuttal to Deterrence   consistent
```

## Evaluation Engine

`PropositionalEvaluationEngine` provides truth-table generation and semantic classification.

```ts
import { PropositionalEvaluationEngine } from 'logic-engine';

const engine = new PropositionalEvaluationEngine();

engine.classify('p | ~p');           // → 'tautology'
engine.classify('p & ~p');           // → 'contradiction'
engine.classify('p -> q');           // → 'contingency'

engine.printTruthTable('p -> q');
```

```text
TRUTH TABLE — p -> q
═════════════════════════
p    │ q    │ VALUE
─────────────────────────
F    │ F    │ T
F    │ T    │ T
T    │ F    │ F
T    │ T    │ T
```

**Classification:** `'tautology'` (true under all assignments), `'contradiction'` (false under all), or `'contingency'` (both).

**`evaluate(formula, variables)`** — works directly with WFF instances when you need the full `EvaluationResult` including the `TruthTable` data structure.

## License

This project is open source and licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
