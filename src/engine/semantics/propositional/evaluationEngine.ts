import { WFF } from '../../../language/propositional/propositionalTypes';
import { PropositionalVariable } from '../../../language/propositional/propositionalVariable';
import { PropositionalSyntaxEngine } from '../../syntax/propositional/syntaxEngine';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** The semantic classification of a propositional formula. */
export type WFFClassification = 'tautology' | 'contradiction' | 'contingency';

/** A single row in a truth table. */
export interface TruthTableRow {
  /** The variable assignment for this row. */
  assignment: Record<string, boolean>;
  /** The formula's truth value under this assignment. */
  value: boolean;
}

/** A complete truth table for a propositional formula. */
export interface TruthTable {
  /** The proposition letters, in evaluation order. */
  variables: string[];
  /** All 2^n rows, ordered by ascending bitmask over the variables. */
  rows: TruthTableRow[];
}

/** The full result of evaluating a propositional formula. */
export interface EvaluationResult {
  /** Tautology, contradiction, or contingency. */
  classification: WFFClassification;
  /** The complete truth table. */
  truthTable: TruthTable;
}

// ---------------------------------------------------------------------------
// PropositionalEvaluationEngine
// ---------------------------------------------------------------------------

/**
 * Semantic evaluation of propositional WFFs.
 *
 * Provides truth-table generation and tautology / contradiction / contingency
 * classification via exhaustive enumeration over all 2^n variable assignments.
 *
 * Works with WFF instances constructed by hand or via PropositionalSyntaxEngine.
 */
export class PropositionalEvaluationEngine {

  private readonly _syntax = new PropositionalSyntaxEngine();

  /**
   * Evaluate a WFF over all possible variable assignments.
   *
   * @param formula   - The formula to evaluate.
   * @param variables - The PropositionalVariables the formula depends on.
   *                    Passed in explicitly so the engine does not need to
   *                    traverse the formula tree to discover them.
   * @returns           Classification and full truth table.
   */
  evaluate(
    formula: WFF,
    variables: Map<string, PropositionalVariable>,
  ): EvaluationResult {
    const varNames = Array.from(variables.keys());
    const n = varNames.length;
    const total = Math.pow(2, n);
    const rows: TruthTableRow[] = [];

    let allTrue  = true;
    let allFalse = true;

    for (let mask = 0; mask < total; mask++) {
      const assignment: Record<string, boolean> = {};

      varNames.forEach((name, i) => {
        const v = Boolean((mask >> i) & 1);
        variables.get(name)!.assign(v);
        assignment[name] = v;
      });

      const value = formula.value();
      rows.push({ assignment, value });

      if (!value) allTrue  = false;
      if (value)  allFalse = false;
    }

    const classification: WFFClassification = allTrue
      ? 'tautology'
      : allFalse
        ? 'contradiction'
        : 'contingency';

    return { classification, truthTable: { variables: varNames, rows } };
  }

  /**
   * Parse a formula string and evaluate it in one step.
   *
   * @param formulaString - A formula string (e.g. "p -> (p | q)").
   * @returns               Classification and full truth table.
   * @throws SyntaxError  if the formula string is malformed.
   */
  evaluateString(formulaString: string): EvaluationResult {
    const { formula, variables } = this._syntax.parse(formulaString);
    return this.evaluate(formula, variables);
  }

  /**
   * Classify a formula string as tautology, contradiction, or contingency.
   *
   * Convenience wrapper around `evaluateString()`.
   *
   * @param formulaString - A formula string.
   * @returns               The classification.
   * @throws SyntaxError  if the formula string is malformed.
   */
  classify(formulaString: string): WFFClassification {
    return this.evaluateString(formulaString).classification;
  }

  /**
   * Generate a truth table for a formula string.
   *
   * Convenience wrapper around `evaluateString()`.
   *
   * @param formulaString - A formula string.
   * @returns               The truth table.
   * @throws SyntaxError  if the formula string is malformed.
   */
  truthTable(formulaString: string): TruthTable {
    return this.evaluateString(formulaString).truthTable;
  }

  /**
   * Print a formatted truth table to the console.
   *
   * @param formulaString - A formula string.
   */
  printTruthTable(formulaString: string): void {
    const { classification, truthTable } = this.evaluateString(formulaString);
    const { variables, rows } = truthTable;

    console.log(`\nTRUTH TABLE — ${formulaString}`);
    console.log('═'.repeat(Math.max(40, formulaString.length + 15)));

    // Header row
    const header = [...variables.map(v => v.padEnd(5)), 'VALUE'].join('│ ');
    console.log(header);
    console.log('─'.repeat(header.length));

    // Data rows
    for (const row of rows) {
      const cells = variables.map(v => (row.assignment[v] ? 'T' : 'F').padEnd(5));
      cells.push(row.value ? 'T' : 'F');
      console.log(cells.join('│ '));
    }

    console.log('─'.repeat(header.length));
    console.log(`Classification: ${classification.toUpperCase()}`);
    console.log('');
  }
}
