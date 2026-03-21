import { WFF } from './propositionalTypes';
import { PropositionalVariable } from './propositionalVariable';
import { PropositionalFormalSentence, PropositionalTheory } from './propositionalTheory';
import { AlethicAssertoric, SentenceSet } from '../shared/types';

/**
 * Fluent builder for constructing a PropositionalTheory.
 *
 * Usage (manual construction):
 *
 *   const builder = new PropositionalTheoryBuilder();
 *   const p = builder.variable('p');
 *   const q = builder.variable('q');
 *
 *   builder
 *     .sentence(
 *       { raw: 'It is raining', confidence: 1.0 },
 *       p.atom(),
 *       ['p'],
 *     )
 *     .sentence(
 *       { raw: 'If it rains, the ground is wet', confidence: 1.0 },
 *       new ComplexImpl(undefined, p.atom(), '->', q.atom()),
 *       ['p', 'q'],
 *     )
 *     .sentence(
 *       { raw: 'The ground is wet', confidence: 1.0 },
 *       q.atom(),
 *       ['q'],
 *     );
 *
 *   const theory = builder.build();
 *   theory.printProof();
 *   theory.printGraph();
 *
 * Future: fromSentenceSet() will accept SentenceSet output from NLPEngine
 * and parse each AlethicAssertoric into a WFF automatically.
 */
export class PropositionalTheoryBuilder {

  private readonly _variables = new Map<string, PropositionalVariable>();
  private readonly _sentences: PropositionalFormalSentence[] = [];
  private _labelCounter = 1;

  /**
   * Declare a named propositional variable.
   * Calling variable() with the same name twice returns the same instance,
   * so it is safe to call at any point during construction.
   */
  variable(name: string): PropositionalVariable {
    if (!this._variables.has(name)) {
      this._variables.set(name, new PropositionalVariable(name));
    }
    return this._variables.get(name)!;
  }

  /**
   * Add a formalised sentence to the theory under construction.
   *
   * @param source       The validated natural language sentence.
   * @param formula      The WFF that formalises the sentence.
   * @param variableNames  Names of the variables this formula depends on.
   *                       Used for the logical relations graph.
   * @param label        Optional display label (default: φ₁, φ₂, …).
   */
  sentence(
    source: AlethicAssertoric,
    formula: WFF,
    variableNames: string[],
    label?: string,
  ): this {
    this._sentences.push({
      source,
      formula,
      variableNames,
      label: label ?? `φ${this._labelCounter++}`,
    });
    return this;
  }

  /**
   * Finalise and return the PropositionalTheory.
   * The builder may continue to be used after calling build().
   */
  build(): PropositionalTheory {
    return new PropositionalTheory(
      [...this._sentences],
      new Map(this._variables),
    );
  }

  /**
   * Placeholder: future entry point for NLP-driven construction.
   * Will accept SentenceSet output from NLPEngine and parse each
   * AlethicAssertoric into a WFF using the propositional SyntaxEngine.
   *
   * @throws Error until SyntaxEngine is implemented.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromSentenceSet(_set: SentenceSet): PropositionalTheory {
    throw new Error(
      'PropositionalTheoryBuilder.fromSentenceSet is not yet implemented. ' +
      'Awaiting PropositionalSyntaxEngine.',
    );
  }
}
