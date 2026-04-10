import { NaturalLanguageSyntaxParser } from '../../../src/engine/syntax/naturalLanguageSyntaxParser';
import { SyntaxTreePrinter } from '../../../src/engine/syntax/syntaxTreePrinter';

describe('SyntaxTreePrinter', () => {
  let parser: NaturalLanguageSyntaxParser;
  let printer: SyntaxTreePrinter;

  beforeEach(() => {
    parser  = new NaturalLanguageSyntaxParser();
    printer = new SyntaxTreePrinter();
  });

  describe('render()', () => {
    test('returns a non-empty string', () => {
      const tree = parser.parse('All men are mortal.');
      expect(printer.render(tree).length).toBeGreaterThan(0);
    });

    test('contains the root label S', () => {
      const tree = parser.parse('All men are mortal.');
      expect(printer.render(tree)).toContain('S');
    });

    test('contains the source sentence in the header', () => {
      const tree = parser.parse('Socrates is mortal.');
      expect(printer.render(tree)).toContain('Socrates is mortal.');
    });

    test('omits header when header=false', () => {
      const tree = parser.parse('Socrates is mortal.');
      const output = printer.render(tree, false);
      expect(output).not.toContain('Syntax Tree');
    });

    test('contains box-drawing characters', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.render(tree);
      expect(output).toMatch(/[└├│─]/);
    });

    test('contains POS tags for terminal nodes', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.render(tree);
      // At least one of the known POS tags should appear
      expect(output).toMatch(/QUANT|DET|N|COP|ADJ|V/);
    });

    test('each terminal shows quoted text', () => {
      const tree = parser.parse('Socrates is mortal.');
      const output = printer.render(tree);
      expect(output).toContain('"Socrates"');
    });

    test('multiple sentences produce distinct renders', () => {
      const t1 = parser.parse('All men are mortal.');
      const t2 = parser.parse('Socrates is a man.');
      expect(printer.render(t1)).not.toBe(printer.render(t2));
    });
  });

  describe('renderTokens()', () => {
    test('returns one line per token', () => {
      const tree = parser.parse('All men are mortal.');
      const lines = printer.renderTokens(tree).split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBe(tree.tokens.length);
    });

    test('each line contains index, POS, and quoted text', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.renderTokens(tree);
      expect(output).toContain('"All"');
      expect(output).toContain('QUANT');
      expect(output).toContain('[');
    });
  });

  describe('renderBracketed()', () => {
    test('returns a single-line string', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.renderBracketed(tree);
      expect(output).not.toContain('\n');
    });

    test('starts with [S', () => {
      const tree = parser.parse('All men are mortal.');
      expect(printer.renderBracketed(tree)).toMatch(/^\[S /);
    });

    test('is balanced in brackets', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.renderBracketed(tree);
      const opens  = (output.match(/\[/g) ?? []).length;
      const closes = (output.match(/\]/g) ?? []).length;
      expect(opens).toBe(closes);
    });

    test('contains the token text', () => {
      const tree = parser.parse('All men are mortal.');
      const output = printer.renderBracketed(tree);
      expect(output).toContain('All');
      expect(output).toContain('mortal');
    });
  });

  describe('print() and printTokens() and printBracketed()', () => {
    test('print() calls console.log without throwing', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const tree = parser.parse('All men are mortal.');
      expect(() => printer.print(tree)).not.toThrow();
      spy.mockRestore();
    });

    test('printTokens() calls console.log without throwing', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const tree = parser.parse('All men are mortal.');
      expect(() => printer.printTokens(tree)).not.toThrow();
      spy.mockRestore();
    });

    test('printBracketed() calls console.log without throwing', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const tree = parser.parse('All men are mortal.');
      expect(() => printer.printBracketed(tree)).not.toThrow();
      spy.mockRestore();
    });
  });
});
