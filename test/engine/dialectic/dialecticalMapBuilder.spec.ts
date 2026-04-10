import { DialecticalMapBuilder } from '../../../src/engine/dialectic/dialecticalMapBuilder';
import { DialecticalMap } from '../../../src/engine/dialectic/dialecticalMap';
import { Argument } from '../../../src/engine/dialectic/dialecticTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sentence(raw: string, confidence = 1.0) {
  return { raw, confidence };
}

function simpleArgument(id: string): Argument {
  return {
    id,
    label: `Argument ${id}`,
    premises: [sentence('p is true')],
    subConclusion: sentence('q is true'),
    target: { kind: 'claim' },
    stance: 'supports',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DialecticalMapBuilder', () => {

  describe('claim()', () => {
    test('returns this for method chaining', () => {
      const builder = new DialecticalMapBuilder();
      expect(builder.claim(sentence('The sky is blue'), 'Test Claim')).toBe(builder);
    });

    test('replaces previous claim when called twice', () => {
      const map = new DialecticalMapBuilder()
        .claim(sentence('First claim'), 'First')
        .claim(sentence('Second claim'), 'Second')
        .build();
      expect(map).toBeInstanceOf(DialecticalMap);
      // evaluate() uses the second claim — just verifying no error
      expect(() => map.evaluate()).not.toThrow();
    });
  });

  describe('argument()', () => {
    test('returns this for method chaining', () => {
      const builder = new DialecticalMapBuilder()
        .claim(sentence('The sky is blue'), 'Claim');
      expect(builder.argument(simpleArgument('a1'))).toBe(builder);
    });

    test('accepts multiple arguments in order', () => {
      const result = new DialecticalMapBuilder()
        .claim(sentence('The sky is blue'), 'Claim')
        .argument(simpleArgument('a1'))
        .argument(simpleArgument('a2'))
        .argument(simpleArgument('a3'))
        .build()
        .evaluate();
      expect(result.arguments).toHaveLength(3);
      expect(result.arguments[0].id).toBe('a1');
      expect(result.arguments[1].id).toBe('a2');
      expect(result.arguments[2].id).toBe('a3');
    });

    test('accepts duplicate argument ids without error', () => {
      expect(() =>
        new DialecticalMapBuilder()
          .claim(sentence('The sky is blue'), 'Claim')
          .argument(simpleArgument('dup'))
          .argument(simpleArgument('dup'))
          .build(),
      ).not.toThrow();
    });
  });

  describe('build()', () => {
    test('returns a DialecticalMap instance', () => {
      const map = new DialecticalMapBuilder()
        .claim(sentence('The sky is blue'), 'Claim')
        .build();
      expect(map).toBeInstanceOf(DialecticalMap);
    });

    test('throws when no claim has been set', () => {
      expect(() => new DialecticalMapBuilder().build()).toThrow(
        /cannot build without a central claim/i,
      );
    });

    test('builds successfully with a claim and no arguments', () => {
      const result = new DialecticalMapBuilder()
        .claim(sentence('The sky is blue'), 'Claim')
        .build()
        .evaluate();
      expect(result.arguments).toHaveLength(0);
      expect(result.evaluations).toHaveLength(0);
      expect(result.tensions).toHaveLength(0);
    });

    test('result carries the claim through to evaluate()', () => {
      const result = new DialecticalMapBuilder()
        .claim(sentence('The sky is blue'), 'Sky Claim')
        .build()
        .evaluate();
      expect(result.claim.label).toBe('Sky Claim');
      expect(result.claim.claim.raw).toBe('The sky is blue');
    });
  });

  describe('full argument stances and targets', () => {
    test('accepts all ArgumentStance values', () => {
      const stances = ['supports', 'attacks', 'qualifies', 'undermines', 'concedes'] as const;
      for (const stance of stances) {
        expect(() =>
          new DialecticalMapBuilder()
            .claim(sentence('The sky is blue'), 'Claim')
            .argument({ ...simpleArgument('a'), stance })
            .build(),
        ).not.toThrow();
      }
    });

    test('accepts ArgumentTarget pointing at another argument', () => {
      expect(() =>
        new DialecticalMapBuilder()
          .claim(sentence('The sky is blue'), 'Claim')
          .argument(simpleArgument('a1'))
          .argument({
            ...simpleArgument('a2'),
            target: { kind: 'argument', argumentId: 'a1' },
            stance: 'attacks',
          })
          .build(),
      ).not.toThrow();
    });

    test('accepts ArgumentTarget pointing at a premise', () => {
      expect(() =>
        new DialecticalMapBuilder()
          .claim(sentence('The sky is blue'), 'Claim')
          .argument(simpleArgument('a1'))
          .argument({
            ...simpleArgument('a2'),
            target: { kind: 'premise', argumentId: 'a1', premiseIndex: 0 },
            stance: 'undermines',
          })
          .build(),
      ).not.toThrow();
    });
  });
});
