import { ModalSystemSpec, World } from './modalTypes';

/**
 * System K — the minimal normal modal logic.
 *
 * No frame conditions. Any accessibility relation is valid.
 * All other normal modal systems extend K with additional axioms
 * corresponding to additional frame conditions.
 *
 * Valid axiom: K  — □(p → q) → (□p → □q)
 */
export const SystemK: ModalSystemSpec = {
  name: 'K',
  validateFrame(_worlds: World[], _accessibility: (from: World, to: World) => boolean): void {
    // K imposes no frame conditions — all frames are valid.
  },
};

/**
 * System T — reflexive frames.
 *
 * Adds to K: every world accesses itself.
 * Corresponds to axiom T: □p → p ("what is necessary is true").
 *
 * Frame condition: ∀w. wRw  (reflexivity)
 */
export const SystemT: ModalSystemSpec = {
  name: 'T',
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void {
    const violated = worlds.find(w => !accessibility(w, w));
    if (violated !== undefined) {
      throw new Error(
        `System T requires a reflexive frame: world '${violated}' does not access itself. ` +
        `Ensure accessibility(w, w) = true for every world w.`,
      );
    }
  },
};

/**
 * System D — serial frames.
 *
 * Adds to K: every world accesses at least one world.
 * Corresponds to axiom D: □p → ◇p ("what is necessary is possible").
 *
 * Frame condition: ∀w. ∃w'. wRw'  (seriality)
 */
export const SystemD: ModalSystemSpec = {
  name: 'D',
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void {
    const violated = worlds.find(w => !worlds.some(w2 => accessibility(w, w2)));
    if (violated !== undefined) {
      throw new Error(
        `System D requires a serial frame: world '${violated}' accesses no other world. ` +
        `Every world must access at least one world.`,
      );
    }
  },
};

/**
 * System S4 — reflexive and transitive frames.
 *
 * Adds to T: if w accesses w' and w' accesses w'', then w accesses w''.
 * Corresponds to axiom 4: □p → □□p ("if necessary, then necessarily necessary").
 *
 * Frame conditions: reflexivity + transitivity
 */
export const SystemS4: ModalSystemSpec = {
  name: 'S4',
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void {
    // Reflexivity (same as T)
    SystemT.validateFrame(worlds, accessibility);

    // Transitivity: if wRw' and w'Rw'' then wRw''
    for (const w of worlds) {
      for (const w2 of worlds) {
        if (!accessibility(w, w2)) continue;
        for (const w3 of worlds) {
          if (accessibility(w2, w3) && !accessibility(w, w3)) {
            throw new Error(
              `System S4 requires a transitive frame: ${w}R${w2} and ${w2}R${w3} ` +
              `but not ${w}R${w3}. Ensure transitivity holds.`,
            );
          }
        }
      }
    }
  },
};

/**
 * System S5 — equivalence frames (reflexive, transitive, symmetric).
 *
 * Adds to S4: if w accesses w' then w' accesses w.
 * Corresponds to axiom 5: ◇p → □◇p ("if possible, then necessarily possible").
 *
 * Frame conditions: reflexivity + transitivity + symmetry
 */
export const SystemS5: ModalSystemSpec = {
  name: 'S5',
  validateFrame(worlds: World[], accessibility: (from: World, to: World) => boolean): void {
    // Reflexivity + Transitivity (same as S4)
    SystemS4.validateFrame(worlds, accessibility);

    // Symmetry: if wRw' then w'Rw
    for (const w of worlds) {
      for (const w2 of worlds) {
        if (accessibility(w, w2) && !accessibility(w2, w)) {
          throw new Error(
            `System S5 requires a symmetric frame: ${w}R${w2} but not ${w2}R${w}. ` +
            `Ensure symmetry holds.`,
          );
        }
      }
    }
  },
};
