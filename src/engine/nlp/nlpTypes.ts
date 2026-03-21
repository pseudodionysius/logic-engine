import { AlethicAssertoric } from '../../language/shared/types';

/**
 * Re-export AlethicAssertoric so callers can import it from the NLP module
 * without needing to know where the canonical definition lives.
 */
export { AlethicAssertoric };

export interface NLPResult {
  /** The original input string. */
  input: string;
  /** Zero or more assertoric sentence candidates found in the input. */
  candidates: AlethicAssertoric[];
}
