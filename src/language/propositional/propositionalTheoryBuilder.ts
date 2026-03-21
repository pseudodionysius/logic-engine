import { WFF } from './propositionalTypes';
import { PropositionalVariable } from './propositionalVariable';
import { PropositionalFormalSentence, PropositionalTheory } from './propositionalTheory';
import { AlethicAssertoric, SentenceSet } from '../shared/types';

/**
 * Fluent builder for constructing a PropositionalTheory.
 *
 * Declare variables with variable(), register sentences with sentence(),
 * then call build() to produce an immutable PropositionalTheory ready for
 * consistency checking and graph output.
 *
 * When PropositionalSyntaxEngine is implemented, fromSentenceSet() will
 * accept SentenceSet output from NLPEngine and parse each AlethicAssertoric
 * into a WFF automatically.
 */
export class PropositionalTheoryBuilder {

  private readonly _variables = new Map<string, PropositionalVariable>();
  private readonly _sentences: PropositionalFormalSentence[] = [];
  private _labelCounter = 1;

  /**
   * Declare a named propositional variable.
   * Calling variable() with the same name twice returns the same instance,
   * so it is safe to call at any point during construction.
   *
   * @param name - The logical name for the variable (e.g. 'p', 'q').
   * @returns    The PropositionalVariable instance for that name.
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
   * @param source        - The validated natural language sentence.
   * @param formula       - The WFF that formalises the sentence.
   * @param variableNames - Names of the variables this formula depends on,
   *                        used when rendering the logical relations graph.
   * @param label         - Optional display label; defaults to φ1, φ2, … in
   *                        the order sentences are added.
   * @returns this, for method chaining.
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
   *
   * @returns A new PropositionalTheory containing all sentences added so far.
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
   * @param _set - The sentence set to formalise.
   * @throws Error until PropositionalSyntaxEngine is implemented.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromSentenceSet(_set: SentenceSet): PropositionalTheory {
    throw new Error(
      'PropositionalTheoryBuilder.fromSentenceSet is not yet implemented. ' +
      'Awaiting PropositionalSyntaxEngine.',
    );
  }
}
