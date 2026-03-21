/**
 * Shared base types across all formal logical languages supported by this engine.
 *
 * Every formal language builds on the concept of a Formula — a syntactically
 * well-formed expression that can be evaluated to a truth value. Language-specific
 * modules (propositional, quantificational, modal, etc.) extend this contract
 * with their own operators, quantifiers, and structural rules.
 */

/**
 * The root contract for any well-formed expression in any supported formal language.
 * All language-specific formula types must satisfy this interface.
 */
export interface Formula {
  value: () => boolean;
}
