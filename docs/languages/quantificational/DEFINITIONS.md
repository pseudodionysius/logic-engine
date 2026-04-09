# Quantificational Logic — Design Notes

## What's Implemented

First-order quantificational logic (predicate logic) over finite domains.

### Core Constructs

| Construct | Propositional Analogue | Purpose |
| --- | --- | --- |
| `Term` (VariableTerm / ConstantTerm) | — | Denote domain elements |
| `PredicateImpl` | — | n-ary relation over domain elements |
| `AtomicFormulaImpl` | `AtomImpl` | Predicate applied to terms |
| `ComplexFormulaImpl` | `ComplexImpl` | Binary connective joining two QFFs |
| `QuantifiedFormulaImpl` | — | ∀ / ∃ binding a variable over a domain |
| `QuantificationalVariable` | `PropositionalVariable` | Named variable with mutable domain-element binding |
| `QuantificationalTheory` | `PropositionalTheory` | Theory with consistency checking over |D|^n assignments |
| `QuantificationalTheoryBuilder` | `PropositionalTheoryBuilder` | Fluent builder for theories |

### Symbols

- Unary operators: `~` (negation)
- Binary operators: `&`, `|`, `->`, `<->`
- Quantifiers: `∀` (universal), `∃` (existential)
- Terms: individual variables (`x`, `y`, `z`), individual constants (`a`, `b`, `c`)
- Predicates: n-ary relations (`F`, `G`, `R`)

### Evaluation

All formulas implement `value(): boolean` from the shared `Formula` interface. Quantified formulas iterate over the finite domain, binding the variable to each element in turn:

- `∀x.φ(x)` → `domain.every(d => { assign x=d; return φ.value() })`
- `∃x.φ(x)` → `domain.some(d => { assign x=d; return φ.value() })`

### Consistency Checking

`checkConsistency()` exhaustively enumerates all `|D|^n` variable assignments (where `D` is the domain, `n` is the number of free variables). This parallels propositional logic's `2^n` truth-table approach.

### Meta-logic Tests

- Structural induction: `value()` is semantically correct at every formula level
- Quantifier duality: `~∀x.F(x) ⟺ ∃x.~F(x)` and `~∃x.F(x) ⟺ ∀x.~F(x)`
- Valid formulas: universal instantiation, existential generalisation, distribution of ∀ over &
- Identity properties: reflexivity, substitution (indirectly via exhaustive evaluation)
- Decision procedure: valid, contradictory, and contingent formulas classified correctly

## What's NOT Implemented

- Function symbols — terms like `f(x)`, `mother(x)` that map domain elements to domain elements
- `QuantificationalSyntaxEngine` — parsing formula strings into QFF instances
- `QuantificationalEvaluationEngine` — systematic model checking beyond consistency
- `QuantificationalTheoryBuilder.fromSentenceSet()` — awaits SyntaxEngine
