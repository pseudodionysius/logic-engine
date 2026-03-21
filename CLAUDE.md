# Logic Engine — CLAUDE.md

## Project Overview

A TypeScript npm library (`logic-engine`) providing types and runtime evaluation for formal logical languages. The primary use cases are building proof systems, formalising natural language processing, and educational exploration of logic. Published to npm at version `1.0.1`.

## Commands

```bash
npm test          # Run all Jest tests (via tsconfig.test.json)
npm run build     # Compile TypeScript → dist/ (via tsconfig.build.json)
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

Tests mirror source structure exactly: every `src/a/b/c.ts` has a corresponding `test/a/b/c.spec.ts`.

```text
src/
  index.ts                                        # Re-exports language + engine
  language/
    shared/
      types.ts                                    # Base Formula interface (root contract)
    propositional/                                # Propositional (classical) logic
      propositionalTypes.d.ts                     # WFF, Atom, Complex, operators
      atom.ts                                     # AtomImpl
      complex.ts                                  # ComplexImpl
      wffBuilder.ts                               # WFFBuilder factory
      propositionalUtils.ts                       # binaryOperatorToLogic, isAtom, isComplex
      index.ts
    quantificational/
      index.ts                                    # TODO
    modal/
      index.ts                                    # TODO
  engine/
    nlp/
      nlpTypes.ts                                 # AlethicAssertoric, NLPResult
      nlpEngine.ts                                # NLPEngine (TODO)
      index.ts
    syntax/
      propositional/syntaxEngine.ts               # TODO
    semantics/
      propositional/evaluationEngine.ts           # TODO

test/
  language/
    propositional/
      atom.spec.ts
      complex.spec.ts
      propositionalUtils.spec.ts
      meta-logic/
        completeness.spec.ts                      # Skipped placeholder
        expressiveAdequacy.spec.ts                # Skipped placeholder
  engine/
    nlp/nlpEngine.spec.ts                         # Skipped placeholder
    syntax/propositional/syntaxEngine.spec.ts     # Skipped placeholder
    semantics/propositional/evaluationEngine.spec.ts  # Skipped placeholder
```

### TypeScript Config Split

| File | Purpose |
| --- | --- |
| `tsconfig.json` | IDE base — includes `src/` + `test/`, no emit |
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

## Core Type System

### Shared (`src/language/shared/types.ts`)

```ts
interface Formula {
  value: () => boolean;
}
```

Every formula type in every language must satisfy `Formula`. This is the root evaluation contract.

### Propositional (`propositionalTypes.d.ts`)

```ts
type UnaryOperator = '~';
type BinaryOperator = '&' | '|' | '->' | '<->';

interface Atom extends Formula {
  unaryOperator: UnaryOperator | undefined;
  proposition?: boolean | (() => boolean);
}

interface Complex extends Formula {
  unaryOperator: UnaryOperator | undefined;
  left?: WFF;
  binaryOperator?: BinaryOperator;
  right?: WFF;
}

type WFF = Atom & Complex; // structural union via interface extension
```

## Propositional Logic — What's Implemented

### `AtomImpl`

Smallest truth-evaluable unit. Accepts a boolean literal or a `() => boolean` thunk. Unary `'~'` negates the result.

### `ComplexImpl`

Combines two `WFF`s with a binary operator. Delegates to `binaryOperatorToLogic`, then applies optional `'~'` to the whole.

### `binaryOperatorToLogic`

| Operator | Semantics |
| --- | --- |
| `'&'` | `(a, b) => a && b` |
| `'\|'` | `(a, b) => a \|\| b` |
| `'->'` | `(a, b) => !a \|\| b` (material implication) |
| `'<->'` | `(a, b) => a === b` (biconditional) |

### `WFFBuilder`

Factory: inspects input shape and returns `AtomImpl` or `ComplexImpl`. Returns `{}` for unrecognised shapes.

### Type guards

- `isAtom(wff)` — checks for `proposition` property
- `isComplex(wff)` — checks for `left` or `binaryOperator` property

## NLP Engine — Design Intent

`NLPEngine.parse(input: string): NLPResult` accepts any string and returns zero or more `AlethicAssertoric` candidates — declarative sentences that make a truth claim and are valid inputs for a formal language engine. Non-declarative input (questions, commands, exclamations) should yield no candidates.

## What Is Not Yet Implemented

- `NLPEngine` — sentence segmentation, mood classification, confidence scoring
- `SyntaxEngine` (propositional) — parsing strings/JSON into WFF instances
- `EvaluationEngine` (propositional) — truth tables, tautology/contradiction checking
- `Quantificational` language module
- `Modal` language module
- Completeness and expressive adequacy proofs (skipped test stubs)

## Conventions

- Every logical construct exposes `value(): boolean` — the evaluation contract for all `Formula` types.
- Tests exhaustively cover every row of each operator's truth table.
- New language modules follow the `propositional/` pattern: `<name>Types.d.ts`, class implementations, utils, builder, `index.ts`, and a matching `test/language/<name>/` directory.
- Skipped tests (`test.skip`) mark planned work — they should describe the intended behaviour before implementation begins.
