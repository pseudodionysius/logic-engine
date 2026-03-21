import { NLPResult } from './nlpTypes';

/**
 * NLPEngine parses arbitrary input strings to identify alethic assertoric
 * sentence candidates that can be handed off to a formal language engine.
 *
 * TODO: Implement sentence segmentation, mood classification, and
 *       confidence scoring. Consider dependency on a POS tagger or
 *       lightweight grammar for declarative-mood detection.
 */
export class NLPEngine {

  /**
   * Parse an arbitrary input string and return zero or more alethic
   * assertoric sentence candidates found within it.
   *
   * @param _input - The natural language string to analyse.
   * @returns       An NLPResult containing the original input and any
   *                assertoric candidates identified.
   * @throws Error  Until the engine is implemented.
   */
  parse(_input: string): NLPResult {
    throw new Error('NLPEngine.parse is not yet implemented');
  }
}
