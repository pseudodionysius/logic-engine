import {
  PhraseLabel,
  PhraseNode,
  POSTag,
  SYNTAX_SCHEMA_VERSION,
  SyntaxNode,
  SyntaxTree,
  TaggedToken,
  TerminalNode,
} from './syntaxTypes';

// ---------------------------------------------------------------------------
// POS tag lexicons
// ---------------------------------------------------------------------------

const DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
]);

const QUANTIFIERS = new Set([
  'all', 'every', 'each', 'any', 'some', 'most', 'few', 'many',
  'both', 'either', 'neither', 'much', 'several', 'enough',
]);

const PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'one', 'ones',
]);

const COPULAS = new Set([
  'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
]);

// Non-modal auxiliaries
const AUXILIARIES = new Set([
  'have', 'has', 'had', 'do', 'does', 'did',
]);

const MODALS = new Set([
  'must', 'can', 'could', 'should', 'would', 'may', 'might',
  'shall', 'will', 'ought', 'need', 'dare',
]);

// Sentence-adverb / modal adverbs (ADV tag — signals modal force)
const MODAL_ADVERBS = new Set([
  'necessarily', 'possibly', 'certainly', 'probably', 'possibly',
  'contingently', 'necessarily', 'actually', 'actually',
]);

const NEGATIONS = new Set(['not', 'never', "n't"]);

const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'of', 'by', 'for', 'with', 'about', 'from',
  'to', 'into', 'onto', 'under', 'over', 'through', 'between',
  'among', 'during', 'after', 'before', 'above', 'below', 'beside',
  'behind', 'beyond', 'within', 'without', 'against', 'along',
  'around', 'near', 'off', 'out', 'up', 'down', 'across',
  'throughout', 'toward', 'towards',
]);

const CONJUNCTIONS = new Set(['and', 'or', 'but', 'nor', 'yet', 'so', 'for']);

// Complementizers (subordinating conjunctions)
const COMPLEMENTIZERS = new Set([
  'that', 'if', 'whether', 'because', 'since', 'although',
  'though', 'unless', 'until', 'when', 'where', 'while',
  'whereas', 'as', 'than',
]);

// Words that appear as particles in structural positions (e.g. "if…then")
const PARTICLES = new Set(['then', 'hence', 'therefore', 'thus']);

const PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', '"', "'", '(', ')']);

// ---------------------------------------------------------------------------
// Morphological heuristics (fallback POS assignment)
// ---------------------------------------------------------------------------

const ADJ_SUFFIXES = [
  'al', 'ous', 'ive', 'ic', 'ful', 'less', 'able', 'ible',
  'ary', 'ory', 'ish', 'like', 'some', 'ward', 'wise',
];
const ADV_SUFFIXES = ['ly'];
const NOUN_SUFFIXES = [
  'tion', 'sion', 'ment', 'ness', 'ity', 'ism', 'ist',
  'ance', 'ence', 'hood', 'ship', 'age', 'ure',
];
const VERB_SUFFIXES = ['ing', 'ed', 'ize', 'ise', 'ify', 'en'];

function morphTag(word: string, isFirstToken: boolean): POSTag {
  const lower = word.toLowerCase();

  for (const suf of ADV_SUFFIXES)  if (lower.endsWith(suf) && lower.length > suf.length + 1) return 'ADV';
  for (const suf of ADJ_SUFFIXES)  if (lower.endsWith(suf) && lower.length > suf.length + 1) return 'ADJ';
  for (const suf of NOUN_SUFFIXES) if (lower.endsWith(suf) && lower.length > suf.length + 1) return 'N';
  for (const suf of VERB_SUFFIXES) if (lower.endsWith(suf) && lower.length > suf.length + 1) return 'V';

  // Capitalized mid-sentence → proper noun
  if (!isFirstToken && /^[A-Z]/.test(word)) return 'PN';

  return 'N'; // default
}

// ---------------------------------------------------------------------------
// POS tagger
// ---------------------------------------------------------------------------

function tagToken(text: string, index: number, total: number): POSTag {
  const lower = text.toLowerCase().replace(/[.,;:!?"'()]+$/, '');
  const isFirst = index === 0;

  if (PUNCTUATION.has(text))         return 'PUNCT';
  if (lower === 'no' && index === 0) return 'QUANT'; // "No man is..."
  if (lower === 'no')                return 'NEG';
  if (NEGATIONS.has(lower))          return 'NEG';
  if (PARTICLES.has(lower))          return 'PART';
  if (COMPLEMENTIZERS.has(lower))    return 'COMP';
  if (MODAL_ADVERBS.has(lower))      return 'ADV';
  if (CONJUNCTIONS.has(lower))       return 'CONJ';
  if (PREPOSITIONS.has(lower))       return 'PREP';
  if (MODALS.has(lower))             return 'MODAL';
  if (COPULAS.has(lower))            return 'COP';
  if (AUXILIARIES.has(lower))        return 'AUX';
  if (PRONOUNS.has(lower))           return 'PRON';
  if (QUANTIFIERS.has(lower))        return 'QUANT';
  if (DETERMINERS.has(lower))        return 'DET';

  return morphTag(text, isFirst);
}

function tagAll(tokens: string[]): TaggedToken[] {
  return tokens.map((text, i) => ({
    text,
    pos: tagToken(text, i, tokens.length),
    index: i,
  }));
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

function tokenize(sentence: string): string[] {
  // Normalise smart quotes; split contractions (can't → can n't)
  const normalized = sentence
    .replace(/['']/g, "'")
    .replace(/n't\b/g, " n't")
    .replace(/,/g, ' ,')
    .replace(/;/g, ' ;')
    .replace(/:/g, ' :')
    .replace(/\./g, ' .')
    .replace(/!/g, ' !')
    .replace(/\?/g, ' ?');
  return normalized.trim().split(/\s+/).filter(t => t.length > 0);
}

// ---------------------------------------------------------------------------
// Parse helpers — tree construction utilities
// ---------------------------------------------------------------------------

function terminal(tok: TaggedToken): TerminalNode {
  return { kind: 'terminal', pos: tok.pos, text: tok.text, index: tok.index };
}

function phrase(label: PhraseLabel, children: SyntaxNode[]): PhraseNode {
  const leaves = flatLeaves(children);
  const startIndex = leaves.length > 0 ? leaves[0].index : 0;
  const endIndex   = leaves.length > 0 ? leaves[leaves.length - 1].index + 1 : 0;
  return { kind: 'phrase', label, children, startIndex, endIndex };
}

function flatLeaves(nodes: SyntaxNode[]): TerminalNode[] {
  const out: TerminalNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'terminal') {
      out.push(n);
    } else {
      out.push(...flatLeaves(n.children));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parser cursor
// ---------------------------------------------------------------------------

class Cursor {
  constructor(
    private readonly tokens: TaggedToken[],
    private pos: number = 0,
  ) {}

  get position(): number { return this.pos; }
  get remaining(): number { return this.tokens.length - this.pos; }
  done(): boolean { return this.pos >= this.tokens.length; }

  peek(offset = 0): TaggedToken | null {
    return this.tokens[this.pos + offset] ?? null;
  }

  is(...tags: POSTag[]): boolean {
    const tok = this.peek();
    return tok !== null && tags.includes(tok.pos);
  }

  consume(): TaggedToken {
    if (this.done()) throw new Error('Unexpected end of token stream.');
    return this.tokens[this.pos++];
  }

  save(): number { return this.pos; }
  restore(saved: number): void { this.pos = saved; }
}

// ---------------------------------------------------------------------------
// Recursive-descent phrase parser
// ---------------------------------------------------------------------------

/**
 * Parse an Adjective Phrase: ADJ+
 * Returns null if no adjective at the current position.
 */
function parseAP(cur: Cursor): PhraseNode | null {
  if (!cur.is('ADJ')) return null;
  const children: SyntaxNode[] = [];
  while (cur.is('ADJ')) {
    children.push(terminal(cur.consume()));
  }
  return phrase('AP', children);
}

/**
 * Parse an Adverb Phrase: ADV+
 * Returns null if no adverb at the current position.
 */
function parseAdvP(cur: Cursor): PhraseNode | null {
  if (!cur.is('ADV')) return null;
  const children: SyntaxNode[] = [];
  while (cur.is('ADV')) {
    children.push(terminal(cur.consume()));
  }
  return phrase('AdvP', children);
}

/**
 * Parse a Noun Phrase: (DET | QUANT)? ADJ* (N | PN | PRON)+
 * Returns null if no NP can be formed.
 */
function parseNP(cur: Cursor): PhraseNode | null {
  const saved = cur.save();
  const children: SyntaxNode[] = [];

  // Optional determiner or quantifier
  if (cur.is('DET', 'QUANT')) {
    children.push(terminal(cur.consume()));
  }

  // Optional adjectives
  while (cur.is('ADJ')) {
    children.push(terminal(cur.consume()));
  }

  // At least one noun head
  if (!cur.is('N', 'PN', 'PRON')) {
    cur.restore(saved);
    return null;
  }
  while (cur.is('N', 'PN')) {
    children.push(terminal(cur.consume()));
  }

  return phrase('NP', children);
}

/**
 * Parse a Prepositional Phrase: PREP NP
 * Returns null if no PP can be formed.
 */
function parsePP(cur: Cursor): PhraseNode | null {
  if (!cur.is('PREP')) return null;
  const saved = cur.save();
  const children: SyntaxNode[] = [];

  children.push(terminal(cur.consume())); // PREP
  const np = parseNP(cur);
  if (np === null) {
    cur.restore(saved);
    return null;
  }
  children.push(np);
  return phrase('PP', children);
}

/**
 * Parse a VP complement: AP | NP (PP)* | PP
 * The complement follows the head verb/copula/modal.
 */
function parseVPComplement(cur: Cursor): SyntaxNode[] {
  const children: SyntaxNode[] = [];

  // Try AP
  const ap = parseAP(cur);
  if (ap) {
    children.push(ap);
  } else {
    // Try NP
    const np = parseNP(cur);
    if (np) {
      children.push(np);
    }
  }

  // Optional PP modifiers
  let pp = parsePP(cur);
  while (pp) {
    children.push(pp);
    pp = parsePP(cur);
  }

  return children;
}

/**
 * Parse a Verb Phrase.
 *
 * Patterns handled:
 *   COP (NEG)? (AP | NP | PP)*
 *   MODAL (NEG)? COP? (AP | NP | PP)*
 *   MODAL (NEG)? V (NP)?
 *   AUX (NEG)? (COP | V) (NP | AP)*
 *   V (NEG)? (NP | PP)*
 *   NEG VP
 *
 * Returns null if nothing resembling a VP is found.
 */
function parseVP(cur: Cursor): PhraseNode | null {
  if (!cur.is('COP', 'MODAL', 'AUX', 'V', 'NEG')) return null;

  const children: SyntaxNode[] = [];

  // Leading NEG ("not mortal" / "never true")
  if (cur.is('NEG') && !cur.is('COP', 'MODAL', 'V', 'AUX')) {
    children.push(terminal(cur.consume()));
  }

  // MODAL head
  if (cur.is('MODAL')) {
    children.push(terminal(cur.consume()));
    if (cur.is('NEG'))  children.push(terminal(cur.consume()));
    if (cur.is('COP'))  children.push(terminal(cur.consume()));
    else if (cur.is('AUX')) children.push(terminal(cur.consume()));
    if (cur.is('V'))    children.push(terminal(cur.consume()));
    children.push(...parseVPComplement(cur));
    return phrase('VP', children);
  }

  // AUX head (have been, do not, etc.)
  if (cur.is('AUX')) {
    children.push(terminal(cur.consume()));
    if (cur.is('NEG'))  children.push(terminal(cur.consume()));
    if (cur.is('COP', 'V')) children.push(terminal(cur.consume()));
    children.push(...parseVPComplement(cur));
    return phrase('VP', children);
  }

  // COP head (is, are, was, were)
  if (cur.is('COP')) {
    children.push(terminal(cur.consume()));
    if (cur.is('NEG'))  children.push(terminal(cur.consume()));
    children.push(...parseVPComplement(cur));
    return phrase('VP', children);
  }

  // Main V head
  if (cur.is('V')) {
    children.push(terminal(cur.consume()));
    if (cur.is('NEG'))  children.push(terminal(cur.consume()));
    const np = parseNP(cur);
    if (np) children.push(np);
    let pp = parsePP(cur);
    while (pp) { children.push(pp); pp = parsePP(cur); }
    return phrase('VP', children);
  }

  return null;
}

/**
 * Parse a Complementizer Phrase (subordinate clause) for "if…then" structures.
 * Consumes: COMP [S-body] (PART "then")?
 */
function parseCP(cur: Cursor, parseS: (c: Cursor) => PhraseNode): PhraseNode | null {
  if (!cur.is('COMP')) return null;
  const children: SyntaxNode[] = [];

  children.push(terminal(cur.consume())); // COMP "if"

  // Parse the embedded S
  const embedded = parseS(cur);
  if (embedded) children.push(embedded);

  // Optional "then" particle
  const tok = cur.peek();
  if (tok && tok.pos === 'PART' && tok.text.toLowerCase() === 'then') {
    children.push(terminal(cur.consume()));
  }

  return phrase('CP', children);
}

/**
 * Parse an S body: NP VP (PP)*
 * Does not consume leading AdvP or COMP — those are handled at the S level.
 */
function parseSBody(cur: Cursor): PhraseNode {
  const children: SyntaxNode[] = [];

  const np = parseNP(cur);
  if (np) children.push(np);

  const vp = parseVP(cur);
  if (vp) children.push(vp);

  // Any trailing PP not consumed by VP
  let pp = parsePP(cur);
  while (pp) { children.push(pp); pp = parsePP(cur); }

  // Absorb any leftover tokens as UNKNOWN terminals
  while (!cur.done()) {
    const tok = cur.peek()!;
    if (tok.pos === 'PUNCT') { cur.consume(); break; }
    children.push(terminal(cur.consume()));
  }

  return phrase('S', children);
}

/**
 * Parse the root S node, including leading AdvPs and conditional CPs.
 */
function parseSRoot(cur: Cursor): PhraseNode {
  const children: SyntaxNode[] = [];

  // Leading sentence-adverb (Necessarily, Possibly, …)
  const advp = parseAdvP(cur);
  if (advp) children.push(advp);

  // Comma after adverb
  if (cur.peek()?.text === ',') cur.consume();

  // Conditional "If … then …"
  if (cur.is('COMP')) {
    const cp = parseCP(cur, c => parseSBody(c));
    if (cp) {
      children.push(cp);
      // Consequent S
      const consequent = parseSBody(cur);
      children.push(consequent);
      return phrase('S', children);
    }
  }

  // Standard S body
  const body = parseSBody(cur);
  // Merge body children into the root S (avoid double S-wrapping)
  return phrase('S', [...children, ...body.children]);
}

// ---------------------------------------------------------------------------
// NaturalLanguageSyntaxParser
// ---------------------------------------------------------------------------

/**
 * Produces constituency syntax trees from natural language sentence strings.
 *
 * The parser is rule-based (no external dependencies or statistical models).
 * It handles common declarative English patterns:
 *
 *   - Simple declarative:      [NP] [VP]
 *   - Quantified:              [QUANT NP] [COP AP/NP]
 *   - With modal adverb:       [AdvP] [S]
 *   - Conditional:             [CP if [S]] [S consequent]
 *   - Copular with PP:         [NP] [COP [PP]]
 *   - With negation:           [NP] [COP NEG AP]
 *
 * The parse tree is a `SyntaxTree` DTO — a plain serializable record.
 * Use `SyntaxTreePrinter` to display it.
 */
export class NaturalLanguageSyntaxParser {

  /**
   * Parse a sentence string into a constituency syntax tree.
   *
   * @param sentence - A natural language sentence string.
   * @returns          A `SyntaxTree` DTO.
   */
  parse(sentence: string): SyntaxTree {
    const rawTokens  = tokenize(sentence);
    const tagged     = tagAll(rawTokens);
    const cur        = new Cursor(tagged);
    const root       = parseSRoot(cur);

    return {
      schemaVersion: SYNTAX_SCHEMA_VERSION,
      source:  sentence,
      tokens:  tagged,
      root,
    };
  }
}
