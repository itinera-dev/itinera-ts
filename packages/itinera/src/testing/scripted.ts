import type { LocalExecutor } from "../executor.js";
import type { WorkflowInstance } from "../instance.js";
import type { AttemptContributing } from "./scripted/attempt.js";
import type { ScriptedRun } from "./scripted/record.js";
import { Writer } from "./scripted/writer.js";

export type {
  AttemptContributing,
  AttemptEmitting,
  AttemptEndings,
  AttemptSettingGlobalMetadata,
} from "./scripted/attempt.js";

/**
 * Starts a scripted run of `instance`: a script that says, for the steps it
 * names, what their attempts do in place of running the steps. Every step is
 * still built for real, its inputs, services and constructor included; only
 * the call to its `run` is replaced, and a step the script does not name
 * runs for real.
 *
 * A mistake in writing the script throws a `TestMistake` where it is written,
 * and what the script leaves out makes `run` reject with one, before the
 * journey starts.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export function scripted(instance: WorkflowInstance): Script {
  return new Writer(instance);
}

/**
 * A scripted run before it names a step: it names steps, asks for every step
 * to be scripted, or runs.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export interface Script {
  /**
   * Starts describing the step, or the rescue step, named `name`.
   *
   * @throws TestMistake when the workflow has no step or rescue step named
   * `name`, or the script named it before.
   */
  step(name: string): NamedStep;
  /** Asks that every step of the workflow be scripted, checked by `run`. */
  ensureAllScripted(): Script;
  /**
   * Runs the journey on `executor`, a new {@link LocalExecutor} unless one
   * is given, playing the script, and resolves to the scripted run: the
   * journey's result and the record of every step.
   *
   * @throws TestMistake, as a rejection, before the journey and any event,
   * listing everything the script leaves out: for each scripted step, the
   * first attempt it can have that is not described, and its rescue step,
   * when it can fail on attempt 1 and the rescue step is not scripted, and,
   * when every step was asked for, each step not scripted.
   *
   * @throws Refusal, as a rejection, when the executor refuses the instance.
   */
  run(executor?: LocalExecutor): Promise<ScriptedRun>;
}

/**
 * A scripted run once a step has ended an attempt: it chooses another
 * attempt of the step, names the next step, asks for every step to be
 * scripted, or runs.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export interface StepScript extends AttemptChoice {
  /**
   * Starts describing the next step, or rescue step, named `name`.
   *
   * @throws TestMistake when the workflow has no step or rescue step named
   * `name`, or the script named it before.
   */
  andStep(name: string): NamedStep;
  /** Asks that every step of the workflow be scripted, checked by `run`. */
  ensureAllScripted(): StepScript;
  /** Runs the journey, as {@link Script.run} does. */
  run(executor?: LocalExecutor): Promise<ScriptedRun>;
}

/**
 * Which attempts of the step are described next: attempt 1 unless another is
 * chosen.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export interface AttemptChoice {
  /**
   * Describes attempt `attempt`, the attempt after the last one described.
   *
   * @throws TestMistake when an attempt before it is not described yet, it
   * was described before, or the step can have no such attempt.
   */
  onAttempt(attempt: number): AttemptScript;
  /**
   * Describes every attempt.
   *
   * @throws TestMistake when an attempt was described before.
   */
  onEveryAttempt(): AttemptScript;
  /**
   * Describes every attempt not yet described.
   *
   * @throws TestMistake when the remaining attempts were described before, or
   * the step can have no attempt after those described.
   */
  onRemainingAttempts(): AttemptScript;
}

/**
 * The step just named: its attempts are chosen, or attempt 1 is described.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export interface NamedStep extends AttemptChoice, AttemptScript {}

/**
 * The attempts chosen, before they do anything: they run the real step, or
 * do what follows.
 *
 * {@includeCode ../../examples/scripted.ts}
 */
export interface AttemptScript extends AttemptContributing {
  /** The attempts run the real step. */
  willRunForReal(): StepScript;
}
