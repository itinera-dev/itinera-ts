import type { StepDescriptor, StepName } from "../../step.js";
import type { StepRequests } from "../../step/declared.js";
import {
  requestsOfDescribed,
  rescueOf,
  type Rescue,
} from "../../step/descriptor.js";
import type { ViolationKind } from "../violation.js";
import { grouped, repeated } from "./tally.js";

/**
 * Two steps of one workflow have the same name, a rescue step's name,
 * `<step name>_rescue`, included.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface DuplicateStepName {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.DuplicateStepName;
  /** The name two steps have. */
  readonly step: StepName;
}

/**
 * A step has both a rescue step and a retry budget greater than 0.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface RescuedStepRetried {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.RescuedStepRetried;
  /** The step with a rescue step. */
  readonly step: StepName;
}

/** A step or a rescue step, by its name, with what it requests. */
export interface Requesting {
  /** Its name. */
  readonly name: StepName;
  /** What its constructor and its `run` request. */
  readonly requests: StepRequests;
}

/** Each step of `steps`, followed by its rescue step, if it has one. */
export function withRescueSteps(
  steps: readonly StepDescriptor[],
): readonly Requesting[] {
  return steps.flatMap(withItsRescueStep);
}

/**
 * The name of the step of `steps`, or of its rescue step, named `name`, or
 * `undefined` when none is.
 */
export function stepNamed(
  steps: readonly StepDescriptor[],
  name: string,
): StepName | undefined {
  return withRescueSteps(steps).find((step) => isNamed(step, name))?.name;
}

/** The names that more than one step or rescue step of `steps` has. */
export function duplicateStepNames(
  steps: readonly StepDescriptor[],
): DuplicateStepName[] {
  return grouped(withRescueSteps(steps), nameOf)
    .filter(repeated)
    .map(duplicateStepName);
}

/** The steps of `steps` with a rescue step and a retry budget above 0. */
export function rescuedStepsRetried(
  steps: readonly StepDescriptor[],
): RescuedStepRetried[] {
  return steps.filter(isRescuedAndRetried).map(rescuedStepRetried);
}

function withItsRescueStep(step: StepDescriptor): readonly Requesting[] {
  const rescue = rescueOf(step);
  const own = { name: step.name, requests: requestsOfDescribed(step) };
  return rescue === undefined ? [own] : [own, requestingOf(rescue)];
}

function requestingOf(rescue: Rescue): Requesting {
  return { name: rescue.name, requests: rescue.requests };
}

function isNamed(step: Requesting, name: string): boolean {
  return step.name === name;
}

function nameOf(step: Requesting): string {
  return step.name;
}

function duplicateStepName([step]: readonly [
  Requesting,
  ...Requesting[],
]): DuplicateStepName {
  return { kind: "duplicate step name", step: step.name };
}

function isRescuedAndRetried(step: StepDescriptor): boolean {
  return rescueOf(step) !== undefined && step.retryBudget > 0;
}

function rescuedStepRetried(step: StepDescriptor): RescuedStepRetried {
  return { kind: "rescued step retried", step: step.name };
}
