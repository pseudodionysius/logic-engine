import { AlethicAssertoric } from '../../language/shared/types';

/**
 * Re-export AlethicAssertoric so callers can import it from the NLP module
 * without needing to know where the canonical definition lives.
 */
export { AlethicAssertoric };

/**
 * The result of processing an input string through NLPEngine.parse().
 * Carries the original input alongside any alethic assertoric sentence
 * candidates identified within it.
 */
export interface NLPResult {
  /** The original input string passed to NLPEngine.parse(). */
  input: string;
  /** Zero or more assertoric sentence candidates found in the input. */
  candidates: AlethicAssertoric[];
}
