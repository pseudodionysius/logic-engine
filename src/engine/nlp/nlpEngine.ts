import { NLPResult } from './nlpTypes';
import { TextSegmenter } from './textSegmenter';
import { SentenceClassifier } from './sentenceClassifier';
import { ArgumentAnalyser } from './argumentAnalyser';
import { FormalAnnotator } from './formalAnnotator';
import { FormalTranslator } from './formalTranslator';

/**
 * NLPEngine — the top-level orchestrator for the NLP pipeline.
 *
 * Pipeline:
 *   raw text → TextSegmenter → SentenceClassifier → ArgumentAnalyser
 *                                                 → FormalAnnotator → FormalTranslator
 *
 * All processing is rule-based and zero-dependency.
 */
export class NLPEngine {

  private readonly _segmenter    = new TextSegmenter();
  private readonly _classifier   = new SentenceClassifier();
  private readonly _analyser     = new ArgumentAnalyser();
  private readonly _annotator    = new FormalAnnotator();
  private readonly _translator   = new FormalTranslator();

  /**
   * Parse an arbitrary input string and return the full NLP pipeline result.
   *
   * Steps:
   *  1. Segment the text into sentence-candidate strings.
   *  2. Classify each candidate — discard non-assertoric sentences.
   *  3. Annotate each assertoric sentence with logical features.
   *  4. Analyse argument structure across the sentence set.
   *  5. Translate into propositional, quantificational, and modal formula strings.
   *
   * @param input - The natural language string to analyse.
   * @returns       A fully populated `NLPResult`.
   */
  parse(input: string): NLPResult {
    const segments   = this._segmenter.segment(input);
    const candidates = this._classifier.classifyAll(segments);
    const sentenceSet = { sentences: candidates };

    const annotated  = this._annotator.annotateAll(candidates);
    const argument   = this._analyser.analyse(candidates);
    const translations = this._translator.translate(sentenceSet, annotated);

    return {
      input,
      candidates,
      sentenceSet,
      annotated,
      argument,
      translations,
    };
  }

  /**
   * Collect all chunks from an `AsyncIterable<string>` source and run the
   * full pipeline over the concatenated text.
   *
   * Works with any async string source: Node.js `stream.Readable` (in text
   * mode), web `ReadableStream` readers, `fs/promises` async iteration, etc.
   *
   * @param source - An async iterable yielding string chunks.
   * @returns       A promise resolving to the full `NLPResult`.
   */
  async parseStream(source: AsyncIterable<string>): Promise<NLPResult> {
    const sentences = await this._segmenter.segmentStream(source);
    const candidates = this._classifier.classifyAll(sentences);
    const sentenceSet = { sentences: candidates };

    const annotated  = this._annotator.annotateAll(candidates);
    const argument   = this._analyser.analyse(candidates);
    const translations = this._translator.translate(sentenceSet, annotated);

    // Reconstruct input from collected sentences for the result record
    const input = sentences.join(' ');

    return {
      input,
      candidates,
      sentenceSet,
      annotated,
      argument,
      translations,
    };
  }
}
