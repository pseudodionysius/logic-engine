# Modal Logic — Design Notes

## System K (Initial Implementation)

System K is the minimal normal modal logic. It adds two operators to propositional logic:

- **Box** `□φ` — "necessarily φ" — true at world w iff φ is true at every world accessible from w
- **Diamond** `◇φ` — "possibly φ" — true at world w iff φ is true at some world accessible from w

### Kripke Semantics

A **Kripke model** M = (W, R, V) consists of:

- **W** — a finite set of possible worlds
- **R** — an accessibility relation on W (R ⊆ W × W)
- **V** — a valuation function: for each proposition letter p, V(p) ⊆ W (the worlds where p is true)

Truth is defined relative to a world:

- M, w ⊨ p        iff w ∈ V(p)
- M, w ⊨ ~φ       iff M, w ⊭ φ
- M, w ⊨ φ & ψ    iff M, w ⊨ φ and M, w ⊨ ψ
- M, w ⊨ φ | ψ    iff M, w ⊨ φ or M, w ⊨ ψ
- M, w ⊨ φ -> ψ   iff M, w ⊭ φ or M, w ⊨ ψ
- M, w ⊨ φ <-> ψ  iff M, w ⊨ φ iff M, w ⊨ ψ
- M, w ⊨ □φ       iff for all w' such that wRw', M, w' ⊨ φ
- M, w ⊨ ◇φ       iff there exists w' such that wRw', M, w' ⊨ φ

### System K — No Frame Conditions

System K imposes **no constraints** on R. Any accessibility relation is valid.
This means □p → p is NOT a theorem of K (that requires reflexivity = system T).

### Valid in K

- **K axiom**: □(p → q) → (□p → □q) — distribution of □ over →
- **Necessitation rule**: if φ is valid, then □φ is valid
- **Modal duality**: □p ⟺ ~◇~p, ◇p ⟺ ~□~p
- **Distribution**: □(p & q) ⟺ (□p & □q)

### NOT valid in K

- □p → p (reflexivity — valid in T)
- □p → □□p (transitivity — valid in S4)
- ◇p → □◇p (symmetry + transitivity — valid in S5)

## Architecture

### Evaluation Model

Parallels quantificational logic exactly:

| Quantificational | Modal |
| --- | --- |
| Domain elements | Worlds |
| Variable assignment | Current world + valuation |
| ∀x.φ(x) | □φ |
| ∃x.φ(x) | ◇φ |
| Predicates | Proposition letters (world-relative) |

### Shared Mutable State

All formulas reference a shared `ModalEvaluationState`:

```typescript
interface ModalEvaluationState {
  currentWorld: World;
  valuation: Map<string, Set<World>>; // propName → worlds where true
}
```

### Consistency Check

Given a frame (W, R) and designated world w₀:

- Enumerate all 2^(|P|×|W|) valuations (P = proposition letters)
- For each valuation, check if all sentences are true at w₀
- Complexity: exponential in propositions × worlds

### Proof Tree Differences from Propositional/Quantificational

Modal proof trees must show the **Kripke model structure**:

- Frame: worlds and accessibility pairs
- Designated world
- Per-world truth table (which propositions are true at which worlds)
- How modal operators traverse the accessibility relation

## Future Systems

Each system adds frame conditions:

| System | Frame Condition |
| --- | --- |
| K | (none) |
| T | Reflexive: wRw |
| S4 | Reflexive + Transitive |
| S5 | Equivalence relation |
| D | Serial: ∀w.∃w'.wRw' |

Implementation: add a `ModalSystem` type and frame validation in the builder/theory.
For now, only K is implemented.
