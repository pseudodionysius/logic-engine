import { NaturalLanguageSyntaxParser } from '../../../src/engine/syntax/naturalLanguageSyntaxParser';
import { PhraseNode, SyntaxNode, TerminalNode } from '../../../src/engine/syntax/syntaxTypes';

describe('NaturalLanguageSyntaxParser', () => {
  let parser: NaturalLanguageSyntaxParser;

  beforeEach(() => { parser = new NaturalLanguageSyntaxParser(); });

  // ── SyntaxTree shape ──────────────────────────────────────────────────────

  describe('SyntaxTree structure', () => {
    test('returns a SyntaxTree with schemaVersion, source, tokens, root', () => {
      const tree = parser.parse('All men are mortal.');
      expect(tree.schemaVersion).toBe('1');
      expect(tree.source).toBe('All men are mortal.');
      expect(Array.isArray(tree.tokens)).toBe(true);
      expect(tree.root).toBeDefined();
      expect(tree.root.kind).toBe('phrase');
    });

    test('root node has label S', () => {
      const tree = parser.parse('Socrates is a man.');
      expect(tree.root.label).toBe('S');
    });

    test('tokens length matches number of word-tokens in the sentence', () => {
      const tree = parser.parse('All men are mortal.');
      // "All", "men", "are", "mortal", "." → 5 tokens
      expect(tree.tokens.length).toBeGreaterThanOrEqual(4);
    });

    test('all tokens carry pos and index fields', () => {
      const tree = parser.parse('Socrates is mortal.');
      tree.tokens.forEach(tok => {
        expect(typeof tok.text).toBe('string');
        expect(typeof tok.pos).toBe('string');
        expect(typeof tok.index).toBe('number');
      });
    });

    test('token indices are sequential starting from 0', () => {
      const tree = parser.parse('All men are mortal.');
      tree.tokens.forEach((tok, i) => {
        expect(tok.index).toBe(i);
      });
    });
  });

  // ── POS tagging ───────────────────────────────────────────────────────────

  describe('POS tagging', () => {
    function posOf(sentence: string, word: string): string {
      const tree = parser.parse(sentence);
      const tok = tree.tokens.find(t => t.text.toLowerCase() === word.toLowerCase());
      return tok?.pos ?? 'NOT_FOUND';
    }

    test('"all" → QUANT', () => expect(posOf('All men are mortal.', 'all')).toBe('QUANT'));
    test('"every" → QUANT', () => expect(posOf('Every student passed.', 'every')).toBe('QUANT'));
    test('"some" → QUANT', () => expect(posOf('Some philosophers are wise.', 'some')).toBe('QUANT'));
    test('"the" → DET',   () => expect(posOf('The cat is on the mat.', 'the')).toBe('DET'));
    test('"is" → COP',    () => expect(posOf('Socrates is mortal.', 'is')).toBe('COP'));
    test('"are" → COP',   () => expect(posOf('All men are mortal.', 'are')).toBe('COP'));
    test('"must" → MODAL', () => expect(posOf('All men must die.', 'must')).toBe('MODAL'));
    test('"not" → NEG',   () => expect(posOf('Socrates is not mortal.', 'not')).toBe('NEG'));
    test('"on" → PREP',   () => expect(posOf('The cat is on the mat.', 'on')).toBe('PREP'));
    test('"and" → CONJ',  () => expect(posOf('Rain and wind arrived.', 'and')).toBe('CONJ'));
    test('"if" → COMP',   () => expect(posOf('If it rains then streets flood.', 'if')).toBe('COMP'));
    test('"then" → PART', () => expect(posOf('If it rains then streets flood.', 'then')).toBe('PART'));
    test('"necessarily" → ADV', () => expect(posOf('Necessarily all bachelors are unmarried.', 'necessarily')).toBe('ADV'));
  });

  // ── NP detection ──────────────────────────────────────────────────────────

  describe('NP identification', () => {
    function findPhrase(tree: ReturnType<NaturalLanguageSyntaxParser['parse']>, label: string): PhraseNode | undefined {
      function search(node: SyntaxNode): PhraseNode | undefined {
        if (node.kind === 'phrase') {
          if (node.label === label) return node;
          for (const child of node.children) {
            const found = search(child);
            if (found) return found;
          }
        }
        return undefined;
      }
      return search(tree.root);
    }

    test('quantified NP contains QUANT terminal', () => {
      const tree = parser.parse('All men are mortal.');
      const np = findPhrase(tree, 'NP');
      expect(np).toBeDefined();
      const quant = np!.children.find(
        c => c.kind === 'terminal' && (c as TerminalNode).pos === 'QUANT',
      );
      expect(quant).toBeDefined();
    });

    test('DET NP contains DET terminal', () => {
      const tree = parser.parse('The cat is on the mat.');
      const np = findPhrase(tree, 'NP');
      expect(np).toBeDefined();
      const det = np!.children.find(
        c => c.kind === 'terminal' && (c as TerminalNode).pos === 'DET',
      );
      expect(det).toBeDefined();
    });
  });

  // ── VP detection ──────────────────────────────────────────────────────────

  describe('VP identification', () => {
    function findVP(tree: ReturnType<NaturalLanguageSyntaxParser['parse']>): PhraseNode | undefined {
      function search(node: SyntaxNode): PhraseNode | undefined {
        if (node.kind === 'phrase') {
          if (node.label === 'VP') return node;
          for (const child of node.children) {
            const found = search(child);
            if (found) return found;
          }
        }
        return undefined;
      }
      return search(tree.root);
    }

    test('"is mortal" — VP contains COP', () => {
      const tree = parser.parse('Socrates is mortal.');
      const vp = findVP(tree);
      expect(vp).toBeDefined();
      const cop = vp!.children.find(
        c => c.kind === 'terminal' && (c as TerminalNode).pos === 'COP',
      );
      expect(cop).toBeDefined();
    });

    test('"is not mortal" — VP contains NEG', () => {
      const tree = parser.parse('Socrates is not mortal.');
      const vp = findVP(tree);
      expect(vp).toBeDefined();
      const neg = vp!.children.find(
        c => c.kind === 'terminal' && (c as TerminalNode).pos === 'NEG',
      );
      expect(neg).toBeDefined();
    });
  });

  // ── Conditional (CP) ──────────────────────────────────────────────────────

  describe('CP — conditional sentences', () => {
    function hasCP(tree: ReturnType<NaturalLanguageSyntaxParser['parse']>): boolean {
      function search(node: SyntaxNode): boolean {
        if (node.kind === 'phrase') {
          if (node.label === 'CP') return true;
          return node.children.some(search);
        }
        return false;
      }
      return search(tree.root);
    }

    test('"If it is raining then the streets are wet." contains a CP', () => {
      const tree = parser.parse('If it is raining then the streets are wet.');
      expect(hasCP(tree)).toBe(true);
    });
  });

  // ── AdvP (modal adverbs) ──────────────────────────────────────────────────

  describe('AdvP — sentence-level modal adverbs', () => {
    function hasAdvP(tree: ReturnType<NaturalLanguageSyntaxParser['parse']>): boolean {
      function search(node: SyntaxNode): boolean {
        if (node.kind === 'phrase') {
          if (node.label === 'AdvP') return true;
          return node.children.some(search);
        }
        return false;
      }
      return search(tree.root);
    }

    test('"Necessarily all bachelors are unmarried." contains AdvP', () => {
      const tree = parser.parse('Necessarily all bachelors are unmarried.');
      expect(hasAdvP(tree)).toBe(true);
    });
  });

  // ── span correctness ──────────────────────────────────────────────────────

  describe('span indices', () => {
    test('root span covers all non-punctuation tokens', () => {
      const tree = parser.parse('All men are mortal.');
      expect(tree.root.startIndex).toBe(0);
      expect(tree.root.endIndex).toBeGreaterThan(0);
    });

    test('child spans are subsets of parent spans', () => {
      const tree = parser.parse('All men are mortal.');
      function checkSpans(node: SyntaxNode, parentStart: number, parentEnd: number): void {
        if (node.kind === 'phrase') {
          expect(node.startIndex).toBeGreaterThanOrEqual(parentStart);
          expect(node.endIndex).toBeLessThanOrEqual(parentEnd);
          node.children.forEach(c => checkSpans(c, node.startIndex, node.endIndex));
        }
      }
      tree.root.children.forEach(c => checkSpans(c, tree.root.startIndex, tree.root.endIndex));
    });
  });
});
