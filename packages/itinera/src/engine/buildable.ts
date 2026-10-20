import type { StepDescriptor, StepName } from "../step.js";
import type { StepRequests } from "../step/declared.js";
import { requestsOfDescribed, type Rescue } from "../step/descriptor.js";
import type { Left } from "./hook.js";

/**
 * A step, or a rescue step, as the engine builds and runs it for an attempt:
 * its name, what it requests, how to build it, and, for a rescue step, what
 * the failed attempt of the step it rescues left for it.
 */
export interface Buildable {
  /** Its name, as its events and aborts name it. */
  readonly name: StepName;
  /** What its constructor and its `run` request. */
  readonly requests: StepRequests;
  /**
   * What the failed attempt of the step it rescues left, for a rescue step;
   * `undefined` for a step.
   */
  readonly rescued: Left | undefined;
  /**
   * Builds it for one attempt, as a new object, giving its constructor
   * `needs`, what its constructor's requests were answered with, in order.
   *
   * @throws Whatever its constructor throws.
   */
  build(needs: readonly unknown[]): Runs;
}

/**
 * A step or a rescue step once built, whose `run` the engine calls, checking
 * what it returns.
 */
export interface Runs {
  run(...requests: never[]): unknown;
}

/** The step `step` describes, as the engine builds it. */
export function ofStep(step: StepDescriptor): Buildable {
  return {
    name: step.name,
    requests: requestsOfDescribed(step),
    rescued: undefined,
    build: (needs) => step.build(needs),
  };
}

/**
 * The rescue step `rescue`, as the engine builds it, given what the failed
 * attempt of the step it rescues left.
 */
export function ofRescue(rescue: Rescue, left: Left): Buildable {
  return {
    name: rescue.name,
    requests: rescue.requests,
    rescued: left,
    build: (needs) => new rescue.step(...(needs as never[])),
  };
}
