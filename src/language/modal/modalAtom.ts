import { MFF, UnaryOperator, ModalEvaluationState } from './modalTypes';

/**
 * Concrete implementation of a modal atomic formula (proposition letter).
 *
 * A proposition letter has a truth value that varies by world. The truth
 * value is looked up from the shared evaluation state's valuation map
 * at the current world.
 *
 * Analogous to AtomImpl in propositional logic and AtomicFormulaImpl in
 * quantificational logic.
 *
 * Example: p, q, r (proposition letters evaluated at the current world)
 */
export class ModalAtomImpl implements MFF {

  /** Optional negation applied to the proposition's truth value. */
  unaryOperator: UnaryOperator | undefined;

  /** The name of this proposition letter. */
  readonly propositionName: string;

  /** The shared evaluation state — holds current world and valuation. */
  private readonly _state: ModalEvaluationState;

  /**
   * @param unaryOperator   - Optional '~' to negate the result.
   * @param propositionName - The name of the proposition letter (e.g. 'p', 'q').
   * @param state           - The shared modal evaluation state.
   */
  constructor(
    unaryOperator: UnaryOperator | undefined,
    propositionName: string,
    state: ModalEvaluationState,
  ) {
    this.unaryOperator = unaryOperator;
    this.propositionName = propositionName;
    this._state = state;
  }

  /**
   * Evaluate the proposition letter at the current world.
   * Returns true iff the current world is in the proposition's extension
   * (the set of worlds where it is true), then applies negation if present.
   */
  value(): boolean {
    const extension = this._state.valuation.get(this.propositionName);
    const rv = extension ? extension.has(this._state.currentWorld) : false;
    return (this.unaryOperator === '~') ? !rv : rv;
  }
}
