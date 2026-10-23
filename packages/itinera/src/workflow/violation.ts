import { closedSet, type ValueOf } from "../closed-set.js";
import type { StepName } from "../step.js";

/**
 * The kinds of violation: what can be wrong in how a workflow is put
 * together, found before any journey. Each value is written as the
 * specification names it, such as `"duplicate step name"`.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export const ViolationKind = closedSet({
  /** Two steps of one workflow have the same name. */
  DuplicateStepName: "duplicate step name",
});

/** One of the values of {@link ViolationKind}. */
export type ViolationKind = ValueOf<typeof ViolationKind>;

/**
 * One thing wrong in how a workflow is put together, with what it concerns.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export type Violation = DuplicateStepName;

/**
 * Two steps of one workflow have the same name.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export interface DuplicateStepName {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.DuplicateStepName;
  /** The name two steps have. */
  readonly step: StepName;
}

/**
 * Every violation found in how a workflow is put together, thrown when its
 * class is defined, or when its builder builds it, before any journey.
 *
 * Its message lists each violation on a line of its own, such as
 * `duplicate step name: charge`.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export class Violations extends Error {
  /** Every violation found, at least one, in the order found. */
  readonly violations: readonly [Violation, ...Violation[]];

  constructor(violations: readonly [Violation, ...Violation[]]) {
    super(violations.map(line).join("\n"));
    this.name = "Violations";
    this.violations = violations;
  }
}

function line(violation: Violation): string {
  return `${violation.kind}: ${violation.step}`;
}

/** Every violation in how the steps given are put together. */
export function violationsOf(
  steps: readonly { readonly name: StepName }[],
): Violation[] {
  const names = steps.map((step) => step.name);
  return [...new Set(names.filter(seenBefore))].map(duplicateStepName);
}

function seenBefore(
  name: StepName,
  index: number,
  names: readonly StepName[],
): boolean {
  return names.indexOf(name) !== index;
}

function duplicateStepName(step: StepName): DuplicateStepName {
  return { kind: ViolationKind.DuplicateStepName, step };
}
