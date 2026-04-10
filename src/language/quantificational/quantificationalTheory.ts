import { QFF, DomainElement, VariableAssignment } from './quantificationalTypes';
import { QuantificationalVariable } from './quantificationalVariable';
import { FormalSentence, Theory, ConsistencyResult, ProofNode, PairwiseRelation, PairwiseSentenceRelation } from '../shared/theory';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A formalised sentence within a quantificational theory.
 * Extends FormalSentence with the set of free variable names the formula
 * depends on, used when rendering the logical relations graph.
 */
export interface QuantificationalFormalSentence extends FormalSentence<QFF> {
  /** Names of the free variables this formula's truth value depends on. */
  variableNames: string[];
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Render a variable assignment as a human-readable string.
 */
function formatValuation(v: Record<string, DomainElement>): string {
  return '{' + Object.entries(v).map(([k, val]) => `${k}=${val}`).join(', ') + '}';
}

/**
 * Recursively print a proof tree node with box-drawing indentation.
 */
function printTree(node: ProofNode, prefix: string, isLast: boolean): void {
  const connector  = isLast ? '└── ' : '├── ';
  const childPfx   = prefix + (isLast ? '    ' : '│   ');
  console.log(prefix + connector + node.label);
  node.children.forEach((child, i) =>
    printTree(child, childPfx, i === node.children.length - 1),
  );
}

/**
 * Print the root of a proof tree, then recursively print all children.
 */
function printTreeRoot(node: ProofNode): void {
  console.log(node.label);
  node.children.forEach((child, i) =>
    printTree(child, '', i === node.children.length - 1),
  );
}

// ─── QuantificationalTheory ─────────────────────────────────────────────────

/**
 * A formal quantificational theory — a finite set of QFFs derived from
 * assertoric sentences, equipped with consistency checking over a finite
 * domain and structured output.
 *
 * Consistency is decided by exhaustive evaluation over all |D|^n variable
 * assignments (where D is the domain and n is the number of free variables),
 * directly paralleling the propositional 2^n truth-table approach.
 *
 * Construct via QuantificationalTheoryBuilder, not directly.
 */
export class QuantificationalTheory implements Theory<QFF, DomainElement> {

  /** The formalised sentences constituting this theory. */
  readonly sentences: QuantificationalFormalSentence[];

  /** The finite domain of discourse. */
  readonly domain: DomainElement[];

  /** The named individual variables shared across sentences, keyed by name. */
  private readonly variables: Map<string, QuantificationalVariable>;

  /** The shared variable assignment. */
  private readonly assignment: VariableAssignment;

  constructor(
    sentences: QuantificationalFormalSentence[],
    domain: DomainElement[],
    variables: Map<string, QuantificationalVariable>,
    assignment: VariableAssignment,
  ) {
    this.sentences = sentences;
    this.domain = domain;
    this.variables = variables;
    this.assignment = assignment;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Determine whether all sentences in the theory can be simultaneously true
   * under some assignment of free variables to domain elements.
   *
   * Algorithm: exhaustive enumeration of all |D|^n variable assignments.
   * Returns on the first satisfying assignment (consistent) or after all
   * assignments are exhausted (inconsistent).
   */
  checkConsistency(): ConsistencyResult<DomainElement> {
    const freeVarNames = Array.from(this.variables.keys());
    const total = Math.pow(this.domain.length, freeVarNames.length);
    const failedValuations: NonNullable<ConsistencyResult<DomainElement>['failedValuations']> = [];

    for (let i = 0; i < total; i++) {
      const valuation = this._applyAssignment(freeVarNames, i);

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
   *               assignment and a verification row for each sentence.
   *
   * Inconsistent: root carries "INCONSISTENT ✗"; children show, for every
   *               variable assignment, which sentence first fails.
   */
  buildProofTree(): ProofNode {
    const result     = this.checkConsistency();
    const freeVarNames = Array.from(this.variables.keys());
    const n          = freeVarNames.length;
    const dSize      = this.domain.length;
    const total      = Math.pow(dSize, n);
    const header     = `Theory: ${this.sentences.length} sentence(s), ` +
                       `${n} free variable(s) {${freeVarNames.join(', ')}}, ` +
                       `domain size ${dSize} {${this.domain.join(', ')}}`;

    if (result.isConsistent) {
      // Restore the witness so formula.value() reflects it.
      Object.entries(result.witness!).forEach(([name, v]) =>
        this.assignment.set(name, v),
      );

      return {
        label: 'CONSISTENT ✓',
        children: [
          { label: header, children: [] },
          { label: `Method: exhaustive evaluation, ${dSize}^${n} = ${total} assignments checked`, children: [] },
          { label: `Satisfying assignment: ${formatValuation(result.witness!)}`, children: [] },
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
        { label: `Method: exhaustive evaluation, ${dSize}^${n} = ${total} assignments checked`, children: [] },
        {
          label: `No satisfying assignment exists. Exhaustion:`,
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
    console.log('\nCONSISTENCY PROOF — Quantificational Logic');
    console.log('═'.repeat(45));
    printTreeRoot(tree);
    console.log('');
  }

  /**
   * Print a graph of logical relations between sentences to the console.
   */
  printGraph(): void {
    const n = this.sentences.length;

    console.log('\nLOGICAL RELATIONS GRAPH — Quantificational Logic');
    console.log('═'.repeat(51));

    // Nodes
    console.log('\nSentences:');
    this.sentences.forEach(s => {
      const vars = s.variableNames.length ? `  [${s.variableNames.join(', ')}]` : '';
      console.log(`  ${s.label.padEnd(5)} "${s.source.raw}"${vars}`);
    });

    // Pairwise relations
    if (n > 1) {
      console.log('\nPairwise relations:');
      const freeVarNames = Array.from(this.variables.keys());
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const rel = this._pairwiseRelation(this.sentences[i], this.sentences[j], freeVarNames);
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

  /**
   * Apply the i-th assignment from the enumeration of |D|^n assignments.
   * Treats i as a base-|D| number where each digit selects a domain element
   * for the corresponding variable.
   */
  private _applyAssignment(varNames: string[], index: number): Record<string, DomainElement> {
    const valuation: Record<string, DomainElement> = {};
    let remaining = index;
    varNames.forEach(name => {
      const dIndex = remaining % this.domain.length;
      remaining = Math.floor(remaining / this.domain.length);
      const element = this.domain[dIndex];
      this.assignment.set(name, element);
      valuation[name] = element;
    });
    return valuation;
  }

  /**
   * Compute the pairwise logical relation between two sentences.
   */
  pairwiseRelations(): PairwiseSentenceRelation<QFF>[] {
    const varNames = Array.from(this.variables.keys());
    const results: PairwiseSentenceRelation<QFF>[] = [];
    for (let i = 0; i < this.sentences.length; i++) {
      for (let j = i + 1; j < this.sentences.length; j++) {
        results.push({
          a: this.sentences[i],
          b: this.sentences[j],
          relation: this._pairwiseRelation(this.sentences[i], this.sentences[j], varNames),
        });
      }
    }
    return results;
  }

  private _pairwiseRelation(
    s1: QuantificationalFormalSentence,
    s2: QuantificationalFormalSentence,
    varNames: string[],
  ): PairwiseRelation {
    let bothTrue        = false;
    let s1TrueS2False   = false;
    let s1FalseS2True   = false;

    const total = Math.pow(this.domain.length, varNames.length);
    for (let i = 0; i < total; i++) {
      this._applyAssignment(varNames, i);
      const v1 = s1.formula.value();
      const v2 = s2.formula.value();
      if (v1 && v2)   bothTrue      = true;
      if (v1 && !v2)  s1TrueS2False = true;
      if (!v1 && v2)  s1FalseS2True = true;
    }

    if (!bothTrue)                          return 'INCONSISTENT';
    if (!s1TrueS2False && !s1FalseS2True)   return 'EQUIVALENT';
    if (!s1TrueS2False)                     return 'ENTAILS_LEFT';
    if (!s1FalseS2True)                     return 'ENTAILS_RIGHT';
    return 'CONSISTENT';
  }

  private _relationLabel(rel: string, l1: string, l2: string): string {
    switch (rel) {
      case 'INCONSISTENT':   return 'INCONSISTENT  (cannot both be true)';
      case 'EQUIVALENT':     return `EQUIVALENT  (${l1} ⟺ ${l2})`;
      case 'ENTAILS_RIGHT':  return `ENTAILS  (${l1} ⊨ ${l2})`;
      case 'ENTAILS_LEFT':   return `ENTAILS  (${l2} ⊨ ${l1})`;
      case 'CONSISTENT':     return 'consistent  (can both be true)';
      default:               return rel;
    }
  }
}
