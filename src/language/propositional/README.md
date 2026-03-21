# Propositional Logic

Classical propositional logic implemented in TypeScript.

## Overview

Propositional logic (also called sentential or zeroth-order logic) is the foundational formal language of this engine. It provides truth-evaluable formulae built from atomic propositions connected by logical operators.

All formula types implement the shared `Formula` interface (`src/language/shared/types.ts`), exposing a `value(): boolean` method as the evaluation contract.

## Types

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

`proposition` may be a `boolean` literal or a `() => boolean` expression. `value()` evaluates the proposition, then applies `'~'` negation if present.

### `ComplexImpl`

```ts
new ComplexImpl(unaryOperator, left, binaryOperator, right)
```

`value()` combines `left.value()` and `right.value()` using the binary operator semantics, then applies `'~'` negation to the whole if present.

### `WFFBuilder`

Factory that inspects an input object and returns the correctly typed `AtomImpl` or `ComplexImpl`.

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

## Planned

- `SyntaxEngine` — parse formula strings and JSON into `WFF` instances
- `EvaluationEngine` — truth table generation, tautology/contradiction/contingency classification
- Completeness proof
- Expressive adequacy proof
