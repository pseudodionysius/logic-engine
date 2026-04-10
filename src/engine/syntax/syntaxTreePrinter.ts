import { PhraseNode, SyntaxNode, SyntaxTree, TerminalNode } from './syntaxTypes';

// ---------------------------------------------------------------------------
// Internal rendering helpers
// ---------------------------------------------------------------------------

function renderNode(node: SyntaxNode, prefix: string, isLast: boolean): string[] {
  const connector  = isLast ? '└── ' : '├── ';
  const childPfx   = prefix + (isLast ? '    ' : '│   ');
  const lines: string[] = [];

  if (node.kind === 'terminal') {
    lines.push(`${prefix}${connector}${node.pos} "${node.text}" [${node.index}]`);
  } else {
    lines.push(
      `${prefix}${connector}${node.label} [${node.startIndex}..${node.endIndex})`,
    );
    node.children.forEach((child, i) => {
      lines.push(...renderNode(child, childPfx, i === node.children.length - 1));
    });
  }

  return lines;
}

function renderRoot(root: PhraseNode): string[] {
  const lines: string[] = [];
  lines.push(`${root.label} [${root.startIndex}..${root.endIndex})`);
  root.children.forEach((child, i) => {
    lines.push(...renderNode(child, '', i === root.children.length - 1));
  });
  return lines;
}

// ---------------------------------------------------------------------------
// SyntaxTreePrinter
// ---------------------------------------------------------------------------

/**
 * Renders `SyntaxTree` DTOs as readable text — either to the console or as a
 * plain string.
 *
 * Output format (box-drawing tree):
 *
 * ```
 * S [0..4)
 * ├── NP [0..2)
 * │   ├── QUANT "All" [0]
 * │   └── N "men" [1]
 * └── VP [2..4)
 *     ├── COP "are" [2]
 *     └── AP [3..4)
 *         └── ADJ "mortal" [3]
 * ```
 *
 * The printer is a stateless utility — instantiate once and reuse freely.
 */
export class SyntaxTreePrinter {

  /**
   * Render a `SyntaxTree` as a multi-line string.
   *
   * @param tree    - The syntax tree to render.
   * @param header  - When true (default), includes the source sentence above
   *                  the tree diagram.
   * @returns        A multi-line string ready for display or storage.
   */
  render(tree: SyntaxTree, header = true): string {
    const parts: string[] = [];

    if (header) {
      parts.push(`Syntax Tree — "${tree.source}"`);
      parts.push('─'.repeat(Math.min(72, tree.source.length + 16)));
    }

    parts.push(...renderRoot(tree.root));
    return parts.join('\n');
  }

  /**
   * Print a `SyntaxTree` to the console.
   *
   * @param tree   - The syntax tree to print.
   * @param header - When true (default), prints the source sentence header.
   */
  print(tree: SyntaxTree, header = true): void {
    console.log('\n' + this.render(tree, header) + '\n');
  }

  /**
   * Render the tagged-token layer only (no phrase structure).
   *
   * Useful for quick inspection of POS tagging results before reviewing the
   * full tree.
   *
   * Format: `[index] POS  "text"`
   *
   * @param tree - The syntax tree whose tokens to render.
   * @returns     A multi-line string of tagged tokens.
   */
  renderTokens(tree: SyntaxTree): string {
    const lines = tree.tokens.map(t =>
      `[${String(t.index).padStart(2)}]  ${t.pos.padEnd(7)}  "${t.text}"`,
    );
    return lines.join('\n');
  }

  /**
   * Print the tagged-token layer to the console.
   *
   * @param tree - The syntax tree whose tokens to print.
   */
  printTokens(tree: SyntaxTree): void {
    console.log('\nTokens:');
    console.log(this.renderTokens(tree));
    console.log('');
  }

  /**
   * Render a bracketed notation string for the syntax tree.
   *
   * Example: `[S [NP [QUANT All][N men]][VP [COP are][AP [ADJ mortal]]]]`
   *
   * This is the standard linguistics bracket notation, useful for compact
   * representation and copy-pasting into analysis tools.
   *
   * @param tree - The syntax tree to bracket-encode.
   * @returns     A single-line bracketed string.
   */
  renderBracketed(tree: SyntaxTree): string {
    return bracketNode(tree.root);
  }

  /**
   * Print the bracketed notation to the console.
   *
   * @param tree - The syntax tree to print.
   */
  printBracketed(tree: SyntaxTree): void {
    console.log('\n' + this.renderBracketed(tree) + '\n');
  }
}

// ---------------------------------------------------------------------------
// Bracketed notation helper
// ---------------------------------------------------------------------------

function bracketNode(node: SyntaxNode): string {
  if (node.kind === 'terminal') {
    return `[${node.pos} ${node.text}]`;
  }
  const inner = node.children.map(bracketNode).join('');
  return `[${node.label} ${inner}]`;
}
