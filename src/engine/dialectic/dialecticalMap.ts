import { AlethicAssertoric, SentenceSet } from '../../language/shared/types';
import { PairwiseRelation } from '../../language/shared/theory';
import { PropositionalVariable } from '../../language/propositional/propositionalVariable';
import { PropositionalFormalSentence, PropositionalTheory } from '../../language/propositional/propositionalTheory';
import { FormalAnnotator } from '../nlp/formalAnnotator';
import { FormalTranslator } from '../nlp/formalTranslator';
import { PropositionalSyntaxEngine } from '../syntax/propositional/syntaxEngine';
import {
  Argument,
  ArgumentEvaluation,
  ArgumentTension,
  ClaimRelation,
  ContentiousClaim,
  DialecticalMapResult,
  EntailmentStrength,
} from './dialecticTypes';

// ─── DialecticalMap ───────────────────────────────────────────────────────────

/**
 * Evaluates a collection of structured arguments around a central contention.
 *
 * For each argument, checks:
 *   - Internal validity: do the premises formally entail the sub-conclusion?
 *   - Claim relation: how does the sub-conclusion relate to the central claim?
 *   - Strength: avg premise confidence weighted by validity.
 *
 * Also computes pairwise tensions (sub-conclusion vs sub-conclusion) across
 * all argument pairs.
 *
 * All formal evaluation is propositional. Construct via DialecticalMapBuilder.
 */
export class DialecticalMap {

  constructor(
    private readonly _claim: ContentiousClaim,
    private readonly _arguments: Argument[],
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Run the full evaluation pipeline and return a DialecticalMapResult.
   */
  evaluate(): DialecticalMapResult {
    const evaluations = this._arguments.map(arg => this._evaluateArgument(arg));
    const tensions    = this._computeTensions();
    return {
      claim:      this._claim,
      arguments:  this._arguments,
      evaluations,
      tensions,
    };
  }

  /**
   * Print a formatted report of the dialectical evaluation to the console.
   */
  printReport(): void {
    const result = this.evaluate();

    console.log('\nDIALECTICAL MAP REPORT');
    console.log('═'.repeat(50));

    console.log(`\nCentral Claim [${result.claim.label}]`);
    console.log(`  "${result.claim.claim.raw}"`);
    console.log(`  confidence: ${result.claim.claim.confidence.toFixed(2)}`);

    console.log(`\nArguments (${result.arguments.length}):`);

    for (const arg of result.arguments) {
      const ev = result.evaluations.find(e => e.argumentId === arg.id)!;
      const targetLabel = this._targetLabel(arg);

      console.log(`\n  [${arg.id}] ${arg.label}  (${arg.stance} → ${targetLabel})`);

      if (arg.premises.length > 0) {
        console.log('  Premises:');
        arg.premises.forEach(p =>
          console.log(`    • "${p.raw}"  (confidence: ${p.confidence.toFixed(2)})`),
        );
      } else {
        console.log('  Premises: (none)');
      }

      console.log(`  Sub-conclusion: "${arg.subConclusion.raw}"`);
      console.log(
        `  Validity: ${ev.internalValidity.padEnd(12)}` +
        `  Claim relation: ${ev.claimRelation.padEnd(14)}` +
        `  Strength: ${ev.strength.toFixed(3)}`,
      );
    }

    if (result.tensions.length > 0) {
      console.log('\nPairwise tensions (sub-conclusions):');
      for (const t of result.tensions) {
        const aLabel = this._arguments.find(a => a.id === t.argumentIdA)?.label ?? t.argumentIdA;
        const bLabel = this._arguments.find(a => a.id === t.argumentIdB)?.label ?? t.argumentIdB;
        const relLabel = this._pairwiseLabel(t.conclusionRelation);
        console.log(`  ${aLabel}  ↔  ${bLabel}   ${relLabel}`);
      }
    }

    console.log('');
  }

  // ── Evaluation helpers ─────────────────────────────────────────────────────

  private _evaluateArgument(arg: Argument): ArgumentEvaluation {
    const internalValidity = this._checkValidity(arg);
    const claimRelation    = this._checkClaimRelation(arg.subConclusion);
    const strength         = this._computeStrength(arg, internalValidity);
    return { argumentId: arg.id, internalValidity, claimRelation, strength };
  }

  /**
   * Check whether the argument's premises formally entail its sub-conclusion.
   *
   * Algorithm:
   *   1. Translate all sentences (premises + sub-conclusion) via NLP pipeline.
   *   2. Synthesize a conjunction of the premise formula strings.
   *   3. Build a 2-sentence PropositionalTheory: [premise-conjunction, sub-conclusion].
   *   4. The pairwise relation ENTAILS_RIGHT → valid; CONSISTENT → consistent;
   *      INCONSISTENT → inconsistent; EQUIVALENT/ENTAILS_LEFT → consistent.
   */
  private _checkValidity(arg: Argument): EntailmentStrength {
    if (arg.premises.length === 0) return 'undetermined';

    const allSentences: AlethicAssertoric[] = [...arg.premises, arg.subConclusion];
    const set: SentenceSet = { sentences: allSentences };

    const annotated    = new FormalAnnotator().annotateAll(allSentences);
    const translations = new FormalTranslator().translate(set, annotated);
    const propTrans    = translations.propositional.sentences;

    if (propTrans.length < 2) return 'undetermined';

    const premiseFormulas    = propTrans.slice(0, -1).map(t => t.formulaString);
    const conclusionFormula  = propTrans[propTrans.length - 1].formulaString;

    const premiseConjunction = premiseFormulas.length === 1
      ? premiseFormulas[0]
      : premiseFormulas.map(f => `(${f})`).join(' & ');

    const variables = new Map<string, PropositionalVariable>();
    const syntax    = new PropositionalSyntaxEngine();

    try {
      const conjWFF = syntax.parseInto(premiseConjunction, variables);
      const concWFF = syntax.parseInto(conclusionFormula, variables);
      const varNames = Array.from(variables.keys());

      const sentences: PropositionalFormalSentence[] = [
        { source: { raw: premiseConjunction, confidence: 1.0 }, formula: conjWFF, variableNames: varNames, label: 'P' },
        { source: arg.subConclusion,                             formula: concWFF, variableNames: varNames, label: 'C' },
      ];
      const theory = new PropositionalTheory(sentences, variables);
      return this._entailmentFromRelation(theory.pairwiseRelations()[0].relation);
    } catch {
      return 'undetermined';
    }
  }

  /**
   * Check how the argument's sub-conclusion relates to the central claim.
   *
   * Translates both sentences together so shared proposition letters map to
   * the same variable.
   */
  private _checkClaimRelation(subConclusion: AlethicAssertoric): ClaimRelation {
    const pair: AlethicAssertoric[] = [subConclusion, this._claim.claim];
    const set: SentenceSet = { sentences: pair };

    const annotated    = new FormalAnnotator().annotateAll(pair);
    const translations = new FormalTranslator().translate(set, annotated);
    const propTrans    = translations.propositional.sentences;

    if (propTrans.length < 2) return 'undetermined';

    const variables = new Map<string, PropositionalVariable>();
    const syntax    = new PropositionalSyntaxEngine();

    try {
      const f1 = syntax.parseInto(propTrans[0].formulaString, variables);
      const f2 = syntax.parseInto(propTrans[1].formulaString, variables);
      const varNames = Array.from(variables.keys());

      const sentences: PropositionalFormalSentence[] = [
        { source: subConclusion,        formula: f1, variableNames: varNames, label: 'SC' },
        { source: this._claim.claim,    formula: f2, variableNames: varNames, label: 'CL' },
      ];
      const theory = new PropositionalTheory(sentences, variables);
      return this._claimRelationFromPairwise(theory.pairwiseRelations()[0].relation);
    } catch {
      return 'undetermined';
    }
  }

  /** Compute pairwise tensions across all argument pairs. */
  private _computeTensions(): ArgumentTension[] {
    const tensions: ArgumentTension[] = [];
    const args = this._arguments;

    for (let i = 0; i < args.length; i++) {
      for (let j = i + 1; j < args.length; j++) {
        tensions.push(this._computeTension(args[i], args[j]));
      }
    }

    return tensions;
  }

  private _computeTension(argA: Argument, argB: Argument): ArgumentTension {
    const pair: AlethicAssertoric[] = [argA.subConclusion, argB.subConclusion];
    const set: SentenceSet = { sentences: pair };

    const annotated    = new FormalAnnotator().annotateAll(pair);
    const translations = new FormalTranslator().translate(set, annotated);
    const propTrans    = translations.propositional.sentences;

    if (propTrans.length < 2) {
      return { argumentIdA: argA.id, argumentIdB: argB.id, conclusionRelation: 'CONSISTENT' };
    }

    const variables = new Map<string, PropositionalVariable>();
    const syntax    = new PropositionalSyntaxEngine();

    try {
      const f1 = syntax.parseInto(propTrans[0].formulaString, variables);
      const f2 = syntax.parseInto(propTrans[1].formulaString, variables);
      const varNames = Array.from(variables.keys());

      const sentences: PropositionalFormalSentence[] = [
        { source: argA.subConclusion, formula: f1, variableNames: varNames, label: 'A' },
        { source: argB.subConclusion, formula: f2, variableNames: varNames, label: 'B' },
      ];
      const theory = new PropositionalTheory(sentences, variables);
      const rel    = theory.pairwiseRelations()[0].relation;
      return { argumentIdA: argA.id, argumentIdB: argB.id, conclusionRelation: rel };
    } catch {
      return { argumentIdA: argA.id, argumentIdB: argB.id, conclusionRelation: 'CONSISTENT' };
    }
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  private _computeStrength(arg: Argument, validity: EntailmentStrength): number {
    if (arg.premises.length === 0) return 0;
    const avgConfidence = arg.premises.reduce((s, p) => s + p.confidence, 0) / arg.premises.length;
    const weight = validity === 'valid' ? 1.0 : validity === 'consistent' ? 0.5 : 0.0;
    return avgConfidence * weight;
  }

  // ── Relation mappings ──────────────────────────────────────────────────────

  // ENTAILS_LEFT is returned when s1TrueS2False=false, i.e. no case where s1=T and s2=F,
  // i.e. s1 ⊨ s2 (the left sentence entails the right sentence).
  // ENTAILS_RIGHT is the mirror: s2 ⊨ s1.

  private _entailmentFromRelation(rel: PairwiseRelation): EntailmentStrength {
    switch (rel) {
      case 'ENTAILS_LEFT':  return 'valid';        // premise-conjunction ⊨ sub-conclusion
      case 'INCONSISTENT':  return 'inconsistent';
      default:              return 'consistent';
    }
  }

  private _claimRelationFromPairwise(rel: PairwiseRelation): ClaimRelation {
    switch (rel) {
      case 'ENTAILS_LEFT':  return 'entails';      // sub-conclusion ⊨ claim
      case 'ENTAILS_RIGHT': return 'entailed-by';  // claim ⊨ sub-conclusion
      case 'EQUIVALENT':    return 'equivalent';
      case 'INCONSISTENT':  return 'contradicts';
      case 'CONSISTENT':    return 'consistent';
    }
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  private _targetLabel(arg: Argument): string {
    switch (arg.target.kind) {
      case 'claim':    return 'claim';
      case 'argument': return `argument:${arg.target.argumentId}`;
      case 'premise':  return `premise[${arg.target.premiseIndex}] of ${arg.target.argumentId}`;
    }
  }

  private _pairwiseLabel(rel: PairwiseRelation): string {
    switch (rel) {
      case 'INCONSISTENT':   return 'INCONSISTENT  (cannot both be true)';
      case 'EQUIVALENT':     return 'EQUIVALENT';
      case 'ENTAILS_RIGHT':  return 'ENTAILS  (A ⊨ B)';
      case 'ENTAILS_LEFT':   return 'ENTAILS  (B ⊨ A)';
      case 'CONSISTENT':     return 'consistent';
    }
  }
}
