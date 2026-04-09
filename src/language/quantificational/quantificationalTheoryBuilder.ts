import { QFF, DomainElement, VariableAssignment } from './quantificationalTypes';
import { QuantificationalVariable } from './quantificationalVariable';
import { PredicateImpl } from './predicate';
import { QuantificationalFormalSentence, QuantificationalTheory } from './quantificationalTheory';
import { AlethicAssertoric, SentenceSet } from '../shared/types';

/**
 * Fluent builder for constructing a QuantificationalTheory.
 *
 * Declare a domain with domain(), variables with variable(), predicates
 * with predicate(), register sentences with sentence(), then call build()
 * to produce an immutable QuantificationalTheory ready for consistency
 * checking and graph output.
 */
export class QuantificationalTheoryBuilder {

  private _domain: DomainElement[] = [];
  private readonly _assignment: VariableAssignment = new Map();
  private readonly _variables = new Map<string, QuantificationalVariable>();
  private readonly _predicates = new Map<string, PredicateImpl>();
  private readonly _sentences: QuantificationalFormalSentence[] = [];
  private _labelCounter = 1;

  /**
   * Set the finite domain of discourse.
   *
   * @param elements - The domain elements to quantify over.
   * @returns this, for method chaining.
   */
  domain(...elements: DomainElement[]): this {
    this._domain = elements;
    return this;
  }

  /**
   * Declare a named individual variable.
   * Calling variable() with the same name twice returns the same instance.
   *
   * @param name - The logical name for the variable (e.g. 'x', 'y').
   * @returns The QuantificationalVariable instance for that name.
   */
  variable(name: string): QuantificationalVariable {
    if (!this._variables.has(name)) {
      this._variables.set(name, new QuantificationalVariable(name, this._assignment));
    }
    return this._variables.get(name)!;
  }

  /**
   * Declare a named predicate.
   * Calling predicate() with the same name twice returns the same instance.
   *
   * @param name  - Display name (e.g. 'Mortal', 'Loves').
   * @param arity - Number of arguments.
   * @param holds - Interpretation function.
   * @returns The PredicateImpl instance.
   */
  predicate(name: string, arity: number, holds: (...args: DomainElement[]) => boolean): PredicateImpl {
    if (!this._predicates.has(name)) {
      this._predicates.set(name, new PredicateImpl(name, arity, holds));
    }
    return this._predicates.get(name)!;
  }

  /**
   * Add a formalised sentence to the theory under construction.
   *
   * @param source        - The validated natural language sentence.
   * @param formula       - The QFF that formalises the sentence.
   * @param variableNames - Names of the free variables this formula depends on.
   * @param label         - Optional display label; defaults to φ1, φ2, …
   * @returns this, for method chaining.
   */
  sentence(
    source: AlethicAssertoric,
    formula: QFF,
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
   * The shared variable assignment map.
   * Exposed so formula constructors can reference it.
   */
  get assignment(): VariableAssignment {
    return this._assignment;
  }

  /**
   * The current domain.
   * Exposed so formula constructors can reference it.
   */
  get currentDomain(): DomainElement[] {
    return this._domain;
  }

  /**
   * Finalise and return the QuantificationalTheory.
   *
   * @returns A new QuantificationalTheory containing all sentences added so far.
   */
  build(): QuantificationalTheory {
    return new QuantificationalTheory(
      [...this._sentences],
      [...this._domain],
      new Map(this._variables),
      this._assignment,
    );
  }

  /**
   * Placeholder: future entry point for NLP-driven construction.
   *
   * @param _set - The sentence set to formalise.
   * @throws Error until QuantificationalSyntaxEngine is implemented.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromSentenceSet(_set: SentenceSet): QuantificationalTheory {
    throw new Error(
      'QuantificationalTheoryBuilder.fromSentenceSet is not yet implemented. ' +
      'Awaiting QuantificationalSyntaxEngine.',
    );
  }
}
