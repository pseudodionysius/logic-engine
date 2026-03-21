import { WFF } from './propositionalTypes';
import { PropositionalVariable } from './propositionalVariable';
import { FormalSentence, Theory, ConsistencyResult, ProofNode } from '../shared/theory';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A formalised sentence within a propositional theory.
 * Extends FormalSentence with the set of variable names the formula depends on,
 * used when rendering the logical relations graph.
 */
export interface PropositionalFormalSentence extends FormalSentence<WFF> {
  /** Names of the PropositionalVariables this formula's truth value depends on. */
  variableNames: string[];
}

/** Pairwise logical relation between two sentences in the same theory. */
export type PairwiseRelation =
  | 'INCONSISTENT'
  | 'EQUIVALENT'
  | 'ENTAILS_RIGHT'   // s1 ⊨ s2
  | 'ENTAILS_LEFT'    // s2 ⊨ s1
  | 'CONSISTENT';

// ─── Internal helpers ────────────────────────────────────────────────────────

function formatValuation(v: Record<string, boolean>): string {
  return '{' + Object.entries(v).map(([k, val]) => `${k}=${val ? 'T' : 'F'}`).join(', ') + '}';
}

function printTree(node: ProofNode, prefix: string, isLast: boolean): void {
  const connector  = isLast ? '└── ' : '├── ';
  const childPfx   = prefix + (isLast ? '    ' : '│   ');
  console.log(prefix + connector + node.label);
  node.children.forEach((child, i) =>
    printTree(child, childPfx, i === node.children.length - 1),
  );
}

function printTreeRoot(node: ProofNode): void {
  console.log(node.label);
  node.children.forEach((child, i) =>
    printTree(child, '', i === node.children.length - 1),
  );
}

// ─── PropositionalTheory ─────────────────────────────────────────────────────

/**
 * A formal propositional theory — a finite set of WFFs derived from assertoric
 * sentences, equipped with consistency checking and structured output.
 *
 * Consistency is decided by exhaustive truth-table evaluation over all 2^n
 * variable assignments (where n is the number of propositional variables).
 *
 * Construct via PropositionalTheoryBuilder, not directly.
 */
export class PropositionalTheory implements Theory<WFF> {

  readonly sentences: PropositionalFormalSentence[];
  private readonly variables: Map<string, PropositionalVariable>;

  constructor(
    sentences: PropositionalFormalSentence[],
    variables: Map<string, PropositionalVariable>,
  ) {
    this.sentences = sentences;
    this.variables = variables;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Determine whether all sentences in the theory can be simultaneously true.
   *
   * Algorithm: exhaustive enumeration of all 2^n variable assignments.
   * Returns on the first satisfying assignment (consistent) or after all
   * assignments are exhausted (inconsistent).
   */
  checkConsistency(): ConsistencyResult {
    const varNames = Array.from(this.variables.keys());
    const total    = Math.pow(2, varNames.length);
    const failedValuations: NonNullable<ConsistencyResult['failedValuations']> = [];

    for (let mask = 0; mask < total; mask++) {
      const valuation = this._applyMask(varNames, mask);

      const firstFailing = this.sentences.find(s => !s.formula.value());
      if (!firstFailing) {
        return { isConsistent: true, witness: valuation };
      }
      failedValuations.push({ valuation, firstFailure: firstFailing.label });
    }

    return { isConsistent: false, failedValuations };
  }

  /**
   * Build a structured proof tree of the consistency result.
   *
   * Consistent:   root carries "CONSISTENT ✓"; children show the witness
   *               valuation and a verification row for each sentence.
   *
   * Inconsistent: root carries "INCONSISTENT ✗"; children show, for every
   *               variable assignment, which sentence first fails — proving
   *               exhaustion of all possible valuations.
   */
  buildProofTree(): ProofNode {
    const result   = this.checkConsistency();
    const varNames = Array.from(this.variables.keys());
    const n        = varNames.length;
    const header   = `Theory: ${this.sentences.length} sentence(s), ` +
                     `${n} variable(s) {${varNames.join(', ')}}`;

    if (result.isConsistent) {
      // Restore the witness valuation so formula.value() reflects it.
      Object.entries(result.witness!).forEach(([name, v]) =>
        this.variables.get(name)!.assign(v),
      );

      return {
        label: 'CONSISTENT ✓',
        children: [
          { label: header, children: [] },
          { label: `Method: exhaustive evaluation, 2^${n} = ${Math.pow(2, n)} valuations checked`, children: [] },
          { label: `Satisfying valuation: ${formatValuation(result.witness!)}`, children: [] },
          {
            label: 'Verification:',
            children: this.sentences.map(s => ({
              label: `${s.label}  ${s.formula.value() ? '✓' : '✗'}  "${s.source.raw}"`,
              children: [],
            })),
          },
        ],
      };
    }

    return {
      label: 'INCONSISTENT ✗',
      children: [
        { label: header, children: [] },
        { label: `Method: exhaustive evaluation, 2^${n} = ${Math.pow(2, n)} valuations checked`, children: [] },
        {
          label: `No satisfying valuation exists. Exhaustion:`,
          children: result.failedValuations!.map(fv => ({
            label: `${formatValuation(fv.valuation)}  →  ${fv.firstFailure} fails`,
            children: [],
          })),
        },
      ],
    };
  }

  /** Print the proof tree to the console. */
  printProof(): void {
    const tree = this.buildProofTree();
    console.log('\nCONSISTENCY PROOF — Propositional Logic');
    console.log('═'.repeat(42));
    printTreeRoot(tree);
    console.log('');
  }

  /**
   * Print a graph of logical relations between sentences to the console.
   *
   * Shows:
   *   - Each sentence as a labelled node
   *   - Pairwise relations (consistent / entailment / equivalent / inconsistent)
   *   - Variables shared between sentences
   */
  printGraph(): void {
    const n        = this.sentences.length;
    const varNames = Array.from(this.variables.keys());

    console.log('\nLOGICAL RELATIONS GRAPH — Propositional Logic');
    console.log('═'.repeat(48));

    // Nodes
    console.log('\nSentences:');
    this.sentences.forEach(s => {
      const vars = s.variableNames.length ? `  [${s.variableNames.join(', ')}]` : '';
      console.log(`  ${s.label.padEnd(5)} "${s.source.raw}"${vars}`);
    });

    // Pairwise relations
    if (n > 1) {
      console.log('\nPairwise relations:');
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const rel = this._pairwiseRelation(this.sentences[i], this.sentences[j], varNames);
          const tag = this._relationLabel(rel, this.sentences[i].label, this.sentences[j].label);
          console.log(`  ${this.sentences[i].label}  ↔  ${this.sentences[j].label}   ${tag}`);
        }
      }
    }

    // Shared variables
    const varToSentences = new Map<string, string[]>();
    this.sentences.forEach(s =>
      s.variableNames.forEach(v => {
        if (!varToSentences.has(v)) varToSentences.set(v, []);
        varToSentences.get(v)!.push(s.label);
      }),
    );
    const shared = Array.from(varToSentences.entries()).filter(([, labels]) => labels.length > 1);
    if (shared.length) {
      console.log('\nShared variables:');
      shared.forEach(([varName, labels]) =>
        console.log(`  ${varName}:  ${labels.join(' — ')}`),
      );
    }

    console.log('');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Apply a bitmask as a variable assignment and return the valuation record. */
  private _applyMask(varNames: string[], mask: number): Record<string, boolean> {
    const valuation: Record<string, boolean> = {};
    varNames.forEach((name, i) => {
      const v = Boolean((mask >> i) & 1);
      this.variables.get(name)!.assign(v);
      valuation[name] = v;
    });
    return valuation;
  }

  /**
   * Compute the pairwise logical relation between two sentences by evaluating
   * all variable assignments and observing the co-truth pattern.
   */
  private _pairwiseRelation(
    s1: PropositionalFormalSentence,
    s2: PropositionalFormalSentence,
    varNames: string[],
  ): PairwiseRelation {
    let bothTrue        = false;
    let s1TrueS2False   = false;
    let s1FalseS2True   = false;

    const total = Math.pow(2, varNames.length);
    for (let mask = 0; mask < total; mask++) {
      this._applyMask(varNames, mask);
      const v1 = s1.formula.value();
      const v2 = s2.formula.value();
      if (v1 && v2)   bothTrue      = true;
      if (v1 && !v2)  s1TrueS2False = true;
      if (!v1 && v2)  s1FalseS2True = true;
    }

    if (!bothTrue)                          return 'INCONSISTENT';
    if (!s1TrueS2False && !s1FalseS2True)   return 'EQUIVALENT';
    if (!s1TrueS2False)                     return 'ENTAILS_LEFT';  // s2 ⊨ s1
    if (!s1FalseS2True)                     return 'ENTAILS_RIGHT'; // s1 ⊨ s2
    return 'CONSISTENT';
  }

  private _relationLabel(rel: PairwiseRelation, l1: string, l2: string): string {
    switch (rel) {
      case 'INCONSISTENT':   return 'INCONSISTENT  (cannot both be true)';
      case 'EQUIVALENT':     return `EQUIVALENT  (${l1} ⟺ ${l2})`;
      case 'ENTAILS_RIGHT':  return `ENTAILS  (${l1} ⊨ ${l2})`;
      case 'ENTAILS_LEFT':   return `ENTAILS  (${l2} ⊨ ${l1})`;
      case 'CONSISTENT':     return 'consistent  (can both be true)';
    }
  }
}
