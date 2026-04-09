import { MFF, World, ModalEvaluationState } from './modalTypes';
import { ModalVariable } from './modalVariable';
import { ModalFormalSentence, ModalTheory } from './modalTheory';
import { AlethicAssertoric, SentenceSet } from '../shared/types';

/**
 * Fluent builder for constructing a ModalTheory.
 *
 * Declare worlds with worlds(), the accessibility relation with
 * accessibility(), the designated world with designatedWorld(),
 * proposition letters with proposition(), register sentences with
 * sentence(), then call build() to produce an immutable ModalTheory
 * ready for consistency checking and graph output.
 */
export class ModalTheoryBuilder {

  private _worlds: World[] = [];
  private _accessibility: (from: World, to: World) => boolean = () => false;
  private _designatedWorld: World = '';
  private readonly _state: ModalEvaluationState = {
    currentWorld: '',
    valuation: new Map(),
  };
  private readonly _variables = new Map<string, ModalVariable>();
  private readonly _sentences: ModalFormalSentence[] = [];
  private _labelCounter = 1;

  /**
   * Set the possible worlds.
   *
   * @param ws - The world identifiers.
   * @returns this, for method chaining.
   */
  worlds(...ws: World[]): this {
    this._worlds = ws;
    return this;
  }

  /**
   * Set the accessibility relation.
   *
   * @param fn - A function returning true when the first world can access the second.
   * @returns this, for method chaining.
   */
  accessibility(fn: (from: World, to: World) => boolean): this {
    this._accessibility = fn;
    return this;
  }

  /**
   * Set the designated world (where sentences are evaluated).
   *
   * @param w - The designated world.
   * @returns this, for method chaining.
   */
  designatedWorld(w: World): this {
    this._designatedWorld = w;
    this._state.currentWorld = w;
    return this;
  }

  /**
   * Declare a named proposition letter.
   * Calling proposition() with the same name twice returns the same instance.
   *
   * @param name - The logical name for the proposition (e.g. 'p', 'q').
   * @returns The ModalVariable instance for that name.
   */
  proposition(name: string): ModalVariable {
    if (!this._variables.has(name)) {
      this._variables.set(name, new ModalVariable(name, this._state));
    }
    return this._variables.get(name)!;
  }

  /**
   * Add a formalised sentence to the theory under construction.
   *
   * @param source          - The validated natural language sentence.
   * @param formula         - The MFF that formalises the sentence.
   * @param propositionNames - Names of the propositions this formula depends on.
   * @param label           - Optional display label; defaults to φ1, φ2, …
   * @returns this, for method chaining.
   */
  sentence(
    source: AlethicAssertoric,
    formula: MFF,
    propositionNames: string[],
    label?: string,
  ): this {
    this._sentences.push({
      source,
      formula,
      propositionNames,
      label: label ?? `φ${this._labelCounter++}`,
    });
    return this;
  }

  /**
   * The shared evaluation state.
   * Exposed so formula constructors can reference it.
   */
  get state(): ModalEvaluationState {
    return this._state;
  }

  /**
   * The current worlds list.
   * Exposed so formula constructors can reference it.
   */
  get currentWorlds(): World[] {
    return this._worlds;
  }

  /**
   * The current accessibility relation.
   * Exposed so formula constructors can reference it.
   */
  get currentAccessibility(): (from: World, to: World) => boolean {
    return this._accessibility;
  }

  /**
   * Finalise and return the ModalTheory.
   *
   * @returns A new ModalTheory containing all sentences added so far.
   */
  build(): ModalTheory {
    return new ModalTheory(
      [...this._sentences],
      [...this._worlds],
      this._accessibility,
      this._designatedWorld,
      new Map(this._variables),
      this._state,
    );
  }

  /**
   * Placeholder: future entry point for NLP-driven construction.
   *
   * @param _set - The sentence set to formalise.
   * @throws Error until ModalSyntaxEngine is implemented.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromSentenceSet(_set: SentenceSet): ModalTheory {
    throw new Error(
      'ModalTheoryBuilder.fromSentenceSet is not yet implemented. ' +
      'Awaiting ModalSyntaxEngine.',
    );
  }
}
