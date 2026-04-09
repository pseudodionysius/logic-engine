import { ModalEvaluationState } from './modalTypes';
import { ModalAtomImpl } from './modalAtom';

/**
 * A named proposition letter with world-relative truth values.
 *
 * Analogous to PropositionalVariable and QuantificationalVariable.
 * All ModalAtomImpl instances created from this variable share the same
 * underlying evaluation state, so updating the valuation updates every
 * derived atom simultaneously.
 *
 * Used by ModalTheory to iterate over valuations during consistency
 * checking, and by ModalFormulaImpl when modal operators traverse worlds.
 */
export class ModalVariable {

  /** The immutable name of this proposition letter (e.g. 'p', 'q'). */
  readonly name: string;

  /** The shared evaluation state this variable participates in. */
  private readonly _state: ModalEvaluationState;

  /**
   * @param name  - The logical name for this proposition letter.
   * @param state - The shared evaluation state.
   */
  constructor(name: string, state: ModalEvaluationState) {
    this.name = name;
    this._state = state;
  }

  /**
   * Create a ModalAtomImpl for this proposition letter.
   *
   * @param negated - When true, wraps the atom with '~'.
   */
  atom(negated = false): ModalAtomImpl {
    return new ModalAtomImpl(
      negated ? '~' : undefined,
      this.name,
      this._state,
    );
  }
}
