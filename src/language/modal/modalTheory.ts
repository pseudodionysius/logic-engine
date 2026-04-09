import { MFF, World, ModalEvaluationState } from './modalTypes';
import { ModalVariable } from './modalVariable';
import { FormalSentence, Theory, ConsistencyResult, ProofNode } from '../shared/theory';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A formalised sentence within a modal theory.
 * Extends FormalSentence with the set of proposition names the formula
 * depends on, used when rendering the logical relations graph.
 */
export interface ModalFormalSentence extends FormalSentence<MFF> {
  /** Names of the proposition letters this formula's truth value depends on. */
  propositionNames: string[];
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Render a valuation as a human-readable string showing per-world truth values.
 */
function formatValuation(v: Record<string, boolean>): string {
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

// ─── ModalTheory ─────────────────────────────────────────────────────────────

/**
 * A formal modal theory — a finite set of MFFs derived from assertoric
 * sentences, equipped with consistency checking over a Kripke frame
 * and structured output.
 *
 * Consistency is decided by exhaustive evaluation over all 2^(|P|×|W|)
 * valuations, where P is the set of proposition letters and W is the set
 * of worlds. For each valuation, all sentences are evaluated at the
 * designated world.
 *
 * Construct via ModalTheoryBuilder, not directly.
 */
export class ModalTheory implements Theory<MFF, boolean> {

  /** The formalised sentences constituting this theory. */
  readonly sentences: ModalFormalSentence[];

  /** The set of possible worlds. */
  readonly worlds: World[];

  /** The accessibility relation. */
  readonly accessibility: (from: World, to: World) => boolean;

  /** The designated world (where sentences are evaluated). */
  readonly designatedWorld: World;

  /** The named proposition variables, keyed by name. */
  private readonly variables: Map<string, ModalVariable>;

  /** The shared evaluation state. */
  private readonly state: ModalEvaluationState;

  constructor(
    sentences: ModalFormalSentence[],
    worlds: World[],
    accessibility: (from: World, to: World) => boolean,
    designatedWorld: World,
    variables: Map<string, ModalVariable>,
    state: ModalEvaluationState,
  ) {
    this.sentences = sentences;
    this.worlds = worlds;
    this.accessibility = accessibility;
    this.designatedWorld = designatedWorld;
    this.variables = variables;
    this.state = state;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Determine whether all sentences in the theory can be simultaneously true
   * at the designated world under some valuation.
   *
   * Algorithm: exhaustive enumeration of all 2^(|P|×|W|) valuations.
   * Each bit in the enumeration index determines whether a proposition
   * is true at a particular world.
   */
  checkConsistency(): ConsistencyResult<boolean> {
    const propNames = Array.from(this.variables.keys());
    const numBits = propNames.length * this.worlds.length;
    const total = Math.pow(2, numBits);
    const failedValuations: NonNullable<ConsistencyResult<boolean>['failedValuations']> = [];

    for (let i = 0; i < total; i++) {
      const valuation = this._applyValuation(propNames, i);
      this.state.currentWorld = this.designatedWorld;

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
   * Modal proof trees include the Kripke frame structure (worlds and
   * accessibility pairs) in addition to the standard verdict, method,
   * and witness/exhaustion nodes.
   */
  buildProofTree(): ProofNode {
    const result     = this.checkConsistency();
    const propNames  = Array.from(this.variables.keys());
    const numBits    = propNames.length * this.worlds.length;
    const total      = Math.pow(2, numBits);

    const accessPairs: string[] = [];
    for (const w1 of this.worlds) {
      for (const w2 of this.worlds) {
        if (this.accessibility(w1, w2)) {
          accessPairs.push(`${w1}R${w2}`);
        }
      }
    }

    const header = `Theory: ${this.sentences.length} sentence(s), ` +
                   `${propNames.length} proposition(s) {${propNames.join(', ')}}, ` +
                   `${this.worlds.length} world(s) {${this.worlds.join(', ')}}`;

    const frameNode: ProofNode = {
      label: 'Kripke frame:',
      children: [
        { label: `Worlds: {${this.worlds.join(', ')}}`, children: [] },
        { label: `Accessibility: {${accessPairs.join(', ') || '(empty)'}}`, children: [] },
        { label: `Designated world: ${this.designatedWorld}`, children: [] },
      ],
    };

    if (result.isConsistent) {
      // Restore the witness so formula.value() reflects it.
      this._restoreValuation(propNames, result.witness!);
      this.state.currentWorld = this.designatedWorld;

      const worldTable: ProofNode = {
        label: 'Per-world valuation:',
        children: this.worlds.map(w => {
          const vals = propNames.map(p => {
            const isTrue = this.state.valuation.get(p)?.has(w) ?? false;
            return `${p}=${isTrue}`;
          });
          return { label: `${w}: {${vals.join(', ')}}`, children: [] };
        }),
      };

      return {
        label: 'CONSISTENT ✓',
        children: [
          { label: header, children: [] },
          frameNode,
          { label: `Method: exhaustive evaluation, 2^(${propNames.length}×${this.worlds.length}) = ${total} valuations checked`, children: [] },
          worldTable,
          {
            label: 'Verification (at designated world):',
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
        frameNode,
        { label: `Method: exhaustive evaluation, 2^(${propNames.length}×${this.worlds.length}) = ${total} valuations checked`, children: [] },
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
    console.log('\nCONSISTENCY PROOF — Modal Logic (System K)');
    console.log('═'.repeat(45));
    printTreeRoot(tree);
    console.log('');
  }

  /**
   * Print a graph of logical relations between sentences to the console.
   */
  printGraph(): void {
    const n = this.sentences.length;

    console.log('\nLOGICAL RELATIONS GRAPH — Modal Logic (System K)');
    console.log('═'.repeat(51));

    // Frame summary
    console.log(`\nFrame: ${this.worlds.length} world(s), designated: ${this.designatedWorld}`);

    // Nodes
    console.log('\nSentences:');
    this.sentences.forEach(s => {
      const props = s.propositionNames.length ? `  [${s.propositionNames.join(', ')}]` : '';
      console.log(`  ${s.label.padEnd(5)} "${s.source.raw}"${props}`);
    });

    // Pairwise relations
    if (n > 1) {
      console.log('\nPairwise relations:');
      const propNames = Array.from(this.variables.keys());
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const rel = this._pairwiseRelation(this.sentences[i], this.sentences[j], propNames);
          const tag = this._relationLabel(rel, this.sentences[i].label, this.sentences[j].label);
          console.log(`  ${this.sentences[i].label}  ↔  ${this.sentences[j].label}   ${tag}`);
        }
      }
    }

    // Shared propositions
    const propToSentences = new Map<string, string[]>();
    this.sentences.forEach(s =>
      s.propositionNames.forEach(p => {
        if (!propToSentences.has(p)) propToSentences.set(p, []);
        propToSentences.get(p)!.push(s.label);
      }),
    );
    const shared = Array.from(propToSentences.entries()).filter(([, labels]) => labels.length > 1);
    if (shared.length) {
      console.log('\nShared propositions:');
      shared.forEach(([propName, labels]) =>
        console.log(`  ${propName}:  ${labels.join(' — ')}`),
      );
    }

    console.log('');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Apply the i-th valuation from the enumeration of 2^(|P|×|W|) valuations.
   * Each bit in i determines whether proposition p is true at world w.
   *
   * Bit layout: for propositions [p0, p1, ...] and worlds [w0, w1, ...],
   * bit (pIdx * |W| + wIdx) controls p_pIdx at w_wIdx.
   */
  private _applyValuation(propNames: string[], index: number): Record<string, boolean> {
    const valuation: Record<string, boolean> = {};

    propNames.forEach((prop, pIdx) => {
      const extension = new Set<World>();
      this.worlds.forEach((w, wIdx) => {
        const bitPos = pIdx * this.worlds.length + wIdx;
        const isTrue = ((index >> bitPos) & 1) === 1;
        const key = `${prop}@${w}`;
        valuation[key] = isTrue;
        if (isTrue) extension.add(w);
      });
      this.state.valuation.set(prop, extension);
    });

    return valuation;
  }

  /**
   * Restore a valuation from a witness record (used after consistency check
   * to make formula.value() reflect the witness).
   */
  private _restoreValuation(propNames: string[], witness: Record<string, boolean>): void {
    propNames.forEach(prop => {
      const extension = new Set<World>();
      this.worlds.forEach(w => {
        if (witness[`${prop}@${w}`]) extension.add(w);
      });
      this.state.valuation.set(prop, extension);
    });
  }

  /**
   * Compute the pairwise logical relation between two sentences.
   */
  private _pairwiseRelation(
    s1: ModalFormalSentence,
    s2: ModalFormalSentence,
    propNames: string[],
  ): string {
    let bothTrue        = false;
    let s1TrueS2False   = false;
    let s1FalseS2True   = false;

    const numBits = propNames.length * this.worlds.length;
    const total = Math.pow(2, numBits);
    for (let i = 0; i < total; i++) {
      this._applyValuation(propNames, i);
      this.state.currentWorld = this.designatedWorld;
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
