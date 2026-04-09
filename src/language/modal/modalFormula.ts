import { MFF, UnaryOperator, ModalOperator, World, ModalEvaluationState } from './modalTypes';

/**
 * Concrete implementation of a modal formula (□ or ◇).
 *
 * This is the construct that distinguishes modal from propositional logic.
 * Evaluates the body formula across worlds reachable via the accessibility
 * relation from the current world.
 *
 * □φ — true at w iff φ is true at every world accessible from w
 * ◇φ — true at w iff φ is true at some world accessible from w
 *
 * Directly parallels QuantifiedFormulaImpl: quantifiers iterate over domain
 * elements, modal operators iterate over accessible worlds.
 */
export class ModalFormulaImpl implements MFF {

  /** Optional negation applied to the modal result. */
  unaryOperator: UnaryOperator | undefined;

  /** The modal operator: □ (necessity) or ◇ (possibility). */
  readonly modalOperator: ModalOperator;

  /** The body (scope) of the modal formula. */
  readonly body: MFF;

  /** The set of all worlds in the model. */
  private readonly _worlds: World[];

  /** The accessibility relation: returns true when from can see to. */
  private readonly _accessibility: (from: World, to: World) => boolean;

  /** The shared evaluation state, mutated during evaluation. */
  private readonly _state: ModalEvaluationState;

  /**
   * @param unaryOperator - Optional '~' to negate the whole modal result.
   * @param modalOperator - '□' or '◇'.
   * @param body          - The formula in the scope of the modal operator.
   * @param worlds        - All worlds in the model.
   * @param accessibility - The accessibility relation.
   * @param state         - The shared evaluation state.
   */
  constructor(
    unaryOperator: UnaryOperator | undefined,
    modalOperator: ModalOperator,
    body: MFF,
    worlds: World[],
    accessibility: (from: World, to: World) => boolean,
    state: ModalEvaluationState,
  ) {
    this.unaryOperator = unaryOperator;
    this.modalOperator = modalOperator;
    this.body = body;
    this._worlds = worlds;
    this._accessibility = accessibility;
    this._state = state;
  }

  /**
   * Evaluate the modal formula at the current world.
   *
   * For □: returns true iff the body is true at every world accessible
   * from the current world. Restores the previous world after evaluation.
   *
   * For ◇: returns true iff the body is true at some world accessible
   * from the current world.
   */
  value(): boolean {
    const currentWorld = this._state.currentWorld;
    const accessibleWorlds = this._worlds.filter(w => this._accessibility(currentWorld, w));

    let rv: boolean;

    if (this.modalOperator === '□') {
      rv = accessibleWorlds.every(w => {
        this._state.currentWorld = w;
        return this.body.value();
      });
    } else {
      rv = accessibleWorlds.some(w => {
        this._state.currentWorld = w;
        return this.body.value();
      });
    }

    // Restore the previous world.
    this._state.currentWorld = currentWorld;

    return (this.unaryOperator === '~') ? !rv : rv;
  }
}
