import { WFF } from '../../../language/propositional/propositionalTypes';
import { AtomImpl } from '../../../language/propositional/atom';
import { ComplexImpl } from '../../../language/propositional/complex';
import { PropositionalVariable } from '../../../language/propositional/propositionalVariable';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

type TT = 'ATOM' | 'NOT' | 'AND' | 'OR' | 'IMPLIES' | 'IFF' | 'LPAREN' | 'RPAREN' | 'EOF';

interface Token {
  type: TT;
  value: string;
  pos: number;
}

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // skip whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    // multi-char operators first
    if (input.startsWith('<->', i)) {
      tokens.push({ type: 'IFF', value: '<->', pos: i });
      i += 3; continue;
    }
    if (input.startsWith('->', i)) {
      tokens.push({ type: 'IMPLIES', value: '->', pos: i });
      i += 2; continue;
    }

    const ch = input[i];
    switch (ch) {
      case '~': tokens.push({ type: 'NOT',    value: ch, pos: i }); i++; break;
      case '&': tokens.push({ type: 'AND',    value: ch, pos: i }); i++; break;
      case '|': tokens.push({ type: 'OR',     value: ch, pos: i }); i++; break;
      case '(': tokens.push({ type: 'LPAREN', value: ch, pos: i }); i++; break;
      case ')': tokens.push({ type: 'RPAREN', value: ch, pos: i }); i++; break;
      default:
        if (/[a-z]/.test(ch)) {
          // atom: one lowercase letter optionally followed by digits
          let j = i + 1;
          while (j < input.length && /[0-9]/.test(input[j])) j++;
          tokens.push({ type: 'ATOM', value: input.slice(i, j), pos: i });
          i = j;
        } else {
          throw new SyntaxError(
            `Unexpected character '${ch}' at position ${i} in formula: "${input}"`,
          );
        }
    }
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// Negation helper — toggles the unary operator on a freshly constructed WFF
// ---------------------------------------------------------------------------

function applyNegation(wff: WFF): WFF {
  const atom = wff as AtomImpl;
  const complex = wff as ComplexImpl;

  if (atom.proposition !== undefined) {
    // It's an AtomImpl
    const wasNegated = atom.unaryOperator === '~';
    return new AtomImpl(wasNegated ? undefined : '~', atom.proposition);
  }

  // It's a ComplexImpl
  const wasNegated = complex.unaryOperator === '~';
  return new ComplexImpl(
    wasNegated ? undefined : '~',
    complex.left,
    complex.binaryOperator,
    complex.right,
  );
}

// ---------------------------------------------------------------------------
// Recursive-descent parser
//
// Precedence (lowest → highest):
//   <->   right-associative
//   ->    right-associative
//   |     left-associative
//   &     left-associative
//   ~     prefix (right-associative)
//   atom / ( formula )
// ---------------------------------------------------------------------------

class Parser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly variables: Map<string, PropositionalVariable>;

  constructor(tokens: Token[], variables: Map<string, PropositionalVariable>) {
    this.tokens = tokens;
    this.variables = variables;
  }

  parse(): WFF {
    const wff = this.parseIff();
    if (this.peek().type !== 'EOF') {
      const tok = this.peek();
      throw new SyntaxError(
        `Unexpected token '${tok.value}' at position ${tok.pos}. ` +
        `Expected end of formula.`,
      );
    }
    return wff;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TT): Token {
    const tok = this.consume();
    if (tok.type !== type) {
      throw new SyntaxError(
        `Expected '${type}' but found '${tok.value}' at position ${tok.pos}.`,
      );
    }
    return tok;
  }

  private parseIff(): WFF {
    const left = this.parseImplies();
    if (this.peek().type === 'IFF') {
      this.consume();
      const right = this.parseIff(); // right-associative
      return new ComplexImpl(undefined, left, '<->', right);
    }
    return left;
  }

  private parseImplies(): WFF {
    const left = this.parseOr();
    if (this.peek().type === 'IMPLIES') {
      this.consume();
      const right = this.parseImplies(); // right-associative
      return new ComplexImpl(undefined, left, '->', right);
    }
    return left;
  }

  private parseOr(): WFF {
    let left = this.parseAnd();
    while (this.peek().type === 'OR') {
      this.consume();
      const right = this.parseAnd();
      left = new ComplexImpl(undefined, left, '|', right);
    }
    return left;
  }

  private parseAnd(): WFF {
    let left = this.parseNot();
    while (this.peek().type === 'AND') {
      this.consume();
      const right = this.parseNot();
      left = new ComplexImpl(undefined, left, '&', right);
    }
    return left;
  }

  private parseNot(): WFF {
    if (this.peek().type === 'NOT') {
      this.consume();
      const inner = this.parseNot();
      return applyNegation(inner);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): WFF {
    const tok = this.peek();

    if (tok.type === 'LPAREN') {
      this.consume();
      const inner = this.parseIff();
      this.expect('RPAREN');
      return inner;
    }

    if (tok.type === 'ATOM') {
      this.consume();
      const name = tok.value;
      if (!this.variables.has(name)) {
        this.variables.set(name, new PropositionalVariable(name));
      }
      return this.variables.get(name)!.atom();
    }

    throw new SyntaxError(
      `Unexpected token '${tok.value}' at position ${tok.pos}. ` +
      `Expected a proposition letter or '('.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

/** The result of parsing a propositional formula string. */
export interface PropositionalParseResult {
  /** The parsed WFF, ready for evaluation. */
  formula: WFF;
  /** Named variables referenced in the formula, keyed by letter. */
  variables: Map<string, PropositionalVariable>;
}

// ---------------------------------------------------------------------------
// PropositionalSyntaxEngine
// ---------------------------------------------------------------------------

/**
 * Parses propositional formula strings into typed WFF instances.
 *
 * Formula syntax:
 *   - Proposition letters: single lowercase letter optionally followed by digits
 *     (p, q, r, p1, q2, …)
 *   - Negation:           ~p   ~(p & q)
 *   - Conjunction:        p & q
 *   - Disjunction:        p | q
 *   - Implication:        p -> q     (right-associative)
 *   - Biconditional:      p <-> q    (right-associative)
 *   - Parentheses:        (p | q) -> r
 *
 * Operator precedence (tightest binding first):
 *   ~ > & > | > -> > <->
 *
 * Double negation (~~p) is reduced to p during parsing.
 *
 * All proposition letters in a formula share PropositionalVariable instances,
 * so assigning a variable updates every atom derived from it simultaneously —
 * consistent with PropositionalTheory's evaluation contract.
 */
export class PropositionalSyntaxEngine {

  /**
   * Parse a formula string, creating fresh PropositionalVariables for each
   * distinct proposition letter encountered.
   *
   * @param input - A propositional formula string (e.g. "p -> (q & ~r)").
   * @returns       The parsed WFF and the variable registry.
   * @throws SyntaxError on malformed input.
   */
  parse(input: string): PropositionalParseResult {
    const variables = new Map<string, PropositionalVariable>();
    const formula = this._doParse(input, variables);
    return { formula, variables };
  }

  /**
   * Parse a formula string into an existing variable registry.
   *
   * Variables already present in the registry are reused, so the returned WFF
   * participates in the same truth-value assignment as other formulas in the
   * same theory. Variables not yet in the registry are created and inserted.
   *
   * Use this when building a PropositionalTheory with multiple sentences that
   * share proposition letters.
   *
   * @param input     - A propositional formula string.
   * @param variables - The shared variable registry to parse into.
   * @returns           The parsed WFF.
   * @throws SyntaxError on malformed input.
   */
  parseInto(input: string, variables: Map<string, PropositionalVariable>): WFF {
    return this._doParse(input, variables);
  }

  // -------------------------------------------------------------------------

  private _doParse(input: string, variables: Map<string, PropositionalVariable>): WFF {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new SyntaxError('Cannot parse an empty formula string.');
    }
    const tokens = tokenize(trimmed);
    return new Parser(tokens, variables).parse();
  }
}
