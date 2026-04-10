import { AlethicAssertoric } from '../../language/shared/types';
import { Argument, ContentiousClaim } from './dialecticTypes';
import { DialecticalMap } from './dialecticalMap';

// ─── DialecticalMapBuilder ────────────────────────────────────────────────────

/**
 * Fluent builder for constructing a DialecticalMap.
 *
 * Set the central claim with claim(), add arguments with argument(), then
 * call build() to produce an immutable DialecticalMap ready for evaluation.
 *
 * Example:
 *
 * ```ts
 * const map = new DialecticalMapBuilder()
 *   .claim({ raw: 'Capital punishment is justified', confidence: 1.0 }, 'Central Claim')
 *   .argument({
 *     id: 'deterrence',
 *     label: 'The Deterrence Argument',
 *     premises: [
 *       { raw: 'Capital punishment deters violent crime', confidence: 0.8 },
 *       { raw: 'Deterring crime saves innocent lives', confidence: 0.9 },
 *     ],
 *     subConclusion: { raw: 'Capital punishment saves innocent lives', confidence: 0.85 },
 *     target: { kind: 'claim' },
 *     stance: 'supports',
 *   })
 *   .build();
 *
 * const result = map.evaluate();
 * map.printReport();
 * ```
 */
export class DialecticalMapBuilder {

  private _claim: ContentiousClaim | null = null;
  private readonly _arguments: Argument[] = [];

  /**
   * Set the central contention around which all arguments are organised.
   * Calling claim() a second time replaces the previous value.
   *
   * @param sentence - The assertoric sentence expressing the claim.
   * @param label    - Human-readable name for the claim.
   * @returns this, for method chaining.
   */
  claim(sentence: AlethicAssertoric, label: string): this {
    this._claim = { claim: sentence, label };
    return this;
  }

  /**
   * Add a structured argument to the map.
   * Arguments are stored in the order they are added.
   *
   * @param arg - The argument to add.
   * @returns this, for method chaining.
   */
  argument(arg: Argument): this {
    this._arguments.push(arg);
    return this;
  }

  /**
   * Finalise and return the DialecticalMap.
   * Throws if no central claim has been set.
   *
   * @returns A new DialecticalMap containing the claim and all added arguments.
   */
  build(): DialecticalMap {
    if (this._claim === null) {
      throw new Error(
        'DialecticalMapBuilder: cannot build without a central claim. ' +
        'Call .claim() before .build().',
      );
    }
    return new DialecticalMap(this._claim, [...this._arguments]);
  }
}
