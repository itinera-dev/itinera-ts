import type { Contributor } from "../journey.js";
import type { Attempt, Outcome, StepName, StepReporter } from "../step.js";
import type { PlainValue } from "../value.js";

/**
 * What a scripted run tells the engine: it records every attempt handed to
 * the construction of its step, and plays, for the attempts it describes,
 * what they do in place of the step's `run`.
 */
export interface Scripting {
  /**
   * Records that `attempt` of the step, or rescue step, `step` is handed to
   * the construction of its step, with the values its requests found, by
   * key: its inputs and, for a rescue step, the contributions it requested
   * of the failed attempt.
   */
  building(
    step: StepName,
    attempt: Attempt,
    values: ReadonlyMap<string, PlainValue>,
  ): void;
  /**
   * What `attempt` of `step` plays in place of the step's `run`, or
   * `undefined` when the real step runs.
   */
  play(step: StepName, attempt: Attempt): Play | undefined;
}

/**
 * A scripted attempt: what it does through the handles the attempt lends,
 * then the outcome it ends with, or a throw, as an error escaping a step's
 * `run`.
 */
export type Play = (lent: PlayedWith) => Promise<Outcome>;

/** The handles an attempt lends what plays it. */
export interface PlayedWith {
  /** The attempt's contributor. */
  readonly contributor: Contributor;
  /** The attempt's step reporter. */
  readonly reporter: StepReporter;
}
