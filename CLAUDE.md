# Logic Engine — CLAUDE.md

## Project Overview

A TypeScript npm library (`logic-engine`) providing types and runtime evaluation for formal logical languages. The primary use cases are building proof systems, formalising natural language processing, and educational exploration of logic. Published to npm at version `1.0.1`.

## Commands

```bash
npm test          # Run all Jest tests
npm run build     # Compile TypeScript → dist/
```

Tests use `ts-jest` directly against source — no build step required before running tests.

## CI/CD — Publishing to npm

Publishing is **manual only** via GitHub Actions `workflow_dispatch`. It never triggers automatically on push.

### Workflow: `.github/workflows/publish.yml`

Trigger: **Actions → "Publish to NPM" → Run workflow** in the GitHub UI.

Input: choose `patch`, `minor`, or `major` (follows semver).

Pipeline order — each step must succeed before the next runs:

1. `npm ci` — install deps
2. `npm test` — all tests must pass (hard gate before any version change)
3. `npm run build` — compile TypeScript
4. `npm version <bump>` — bumps `package.json`, commits `chore: bump version to vX.Y.Z [skip ci]`, creates git tag
5. `git push --follow-tags` — pushes commit + tag to `master`
6. `npm publish` — publishes `dist/` to the npm registry

### Required GitHub Secret

| Secret | Where to get it |
| --- | --- |
| `NPM_TOKEN` | npmjs.com → Profile → Access Tokens → Generate New Token (Automation type) |

Add it at: `https://github.com/NathOrmond/logic-engine/settings/secrets/actions`

## Architecture

```text
src/
  index.ts                         # Re-exports everything
  language/
    first-order/
      firstOrderTypes.d.ts         # Core type definitions (WFF, Atom, Complex, operators)
      atom.ts                      # AtomImpl class
      complex.ts                   # ComplexImpl class
      wffBuilder.ts                # WFFBuilder factory
      firstOrderUtils.ts           # binaryOperatorToLogic map, isAtom/isComplex guards
      wff.ts                       # Incomplete stub (commented out)
      index.ts
  engine/
    syntax/syntaxEngine.ts         # TODO
    semantics/evaluationEngine.ts  # TODO

test/
  language/first-order/
    atom.spec.ts
    complex.spec.ts
    firstOrderUtils.spec.ts
    meta-logic/
      completeness.spec.ts         # Skipped placeholder
      expressiveAdequacy.spec.ts   # Skipped placeholder
```

### Path Aliases (tsconfig)

| Alias | Resolves to |
| --- | --- |
| `@src/*` | `src/*` |
| `@language/*` | `src/language/*` |
| `@firstOrder/*` | `src/language/firstOrder/*` |
| `@engine/*` | `src/engine/*` |

## Core Type System (`firstOrderTypes.d.ts`)

```ts
type UnaryOperator = '~';
type BinaryOperator = '&' | '|' | '->' | '<->';

interface Atom {
  unaryOperator: UnaryOperator | undefined;
  proposition?: boolean | (() => boolean);
  value: () => boolean;
}

interface Complex {
  unaryOperator: UnaryOperator | undefined;
  left?: WFF;
  binaryOperator?: BinaryOperator;
  right?: WFF;
  value: () => boolean;
}

type WFF = Atom | Complex;
```

## First-Order Logic — What's Implemented

### `AtomImpl` (`atom.ts`)

Smallest truth-evaluable unit. Accepts a boolean literal or a `() => boolean` thunk as its proposition. Unary `'~'` negates the result.

### `ComplexImpl` (`complex.ts`)

Combines two `WFF`s with a binary operator. Truth evaluation delegates to `binaryOperatorToLogic`, then applies optional `'~'` negation to the whole.

### `binaryOperatorToLogic` (`firstOrderUtils.ts`)

| Operator | Semantics |
| --- | --- |
| `'&'` | `(a, b) => a && b` |
| `'\|'` | `(a, b) => a \|\| b` |
| `'->'` | `(a, b) => !a \|\| b` (material implication) |
| `'<->'` | `(a, b) => a === b` (biconditional) |

### `WFFBuilder` (`wffBuilder.ts`)

Factory: inspects input shape and returns the correct `AtomImpl` or `ComplexImpl`. Returns `{}` for unrecognised shapes.

### Type guards

- `isAtom(wff)` — checks for `proposition` property
- `isComplex(wff)` — checks for `left` or `binaryOperator` property

## What Is Not Yet Implemented

- `SyntaxEngine` — parsing strings/JSON into WFF instances
- `EvaluationEngine` — semantic evaluation beyond `.value()`
- Completeness and expressive adequacy proofs (tests are skipped stubs)
- Quantificational logic, Modal logic, Paraconsistent logic (roadmap only)

## Conventions

- Every logical construct exposes a `value(): boolean` method — this is the evaluation contract for all WFF types.
- The library is purely functional at the type level; no mutable state in implementations.
- Tests exhaustively cover every row of each operator's truth table.
- New language implementations should follow the `first-order/` pattern: types file, class implementations, utils, builder, index re-export, and a corresponding `test/language/<name>/` directory.
