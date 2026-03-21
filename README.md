# Logic Engine

A TypeScript library providing types and runtime evaluation for formal logical languages. Use it to build proof systems, formalise natural language processing pipelines, or explore the theory and limits of formal logic.

## Install

```bash
npm install logic-engine
```

## How it works

The engine has two layers:

1. **Language modules** — define the syntax and semantics of a formal language (propositional, quantificational, modal, …). Each language exposes well-formed formula types and a `value(): boolean` evaluation contract.
2. **Engine modules** — process input. The NLP engine identifies assertoric sentence candidates in natural language; syntax and evaluation engines then formalise and reason about them.

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

`proposition` can be a boolean literal or a `() => boolean` expression. The only unary operator is `'~'` (negation).

```ts
const t = new AtomImpl(undefined, true);          // value() → true
const f = new AtomImpl('~', true);                // value() → false  (negated)
const e = new AtomImpl(undefined, () => 2 + 2 === 4); // value() → true
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

#### `WFFBuilder`

Factory that constructs the correct type from an input object:

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

`NLPEngine.parse(input)` accepts any string and returns `AlethicAssertoric` candidates — declarative sentences that make a truth claim and can be passed to a formal language engine. Non-declarative input (questions, commands, exclamations) yields no candidates.

```ts
interface AlethicAssertoric {
  raw: string;        // extracted sentence
  confidence: number; // 0–1 confidence it is assertoric
}
```

## Syntax Engine

> In Progress

Parses formula strings and JSON into typed `WFF` instances, validating syntactic correctness against the propositional grammar.

## Evaluation Engine

> In Progress

Semantic evaluation of propositional formulae: truth table generation, tautology / contradiction / contingency classification, and proof support.
