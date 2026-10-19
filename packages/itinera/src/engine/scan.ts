import { EventKind } from "../event/kind.js";
import { AbortReason, type FailureWithError } from "../journey.js";
import { RetryCause } from "../policy.js";
import { Attempt, type Step, type StepDescriptor } from "../step.js";
import { nextAttempt } from "../step/attempt.js";
import { isOutcome } from "../step/outcome.js";
import { afterAbnormalTermination } from "./decision.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { JourneyAbortError } from "./signal.js";

/**
 * Runs the journey: starts it, runs its steps in their order, each attempted
 * until it is done or the journey ends, then says how the journey ended.
 * Returns why it failed, when it failed.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function travel(
  journey: Journey,
  steps: readonly StepDescriptor[],
  initialKeys: readonly string[],
): Promise<FailureWithError | undefined> {
  await journey.emit({ kind: EventKind.JourneyStarted, initialKeys });
  const failing = await scan(journey, steps);
  journey.step = undefined;
  if (failing === undefined) {
    await journey.emit({
      kind: EventKind.JourneySucceeded,
      decidedBy: "default",
    });
    return undefined;
  }
  await journey.emit({
    kind: EventKind.JourneyFailed,
    step: failing.step.name,
    cause: failing.failure.cause,
    errorMessage: failing.failure.errorMessage,
    decidedBy: "default",
  });
  return failing.failure;
}

/** A step given up, and why the journey fails. */
interface Failing {
  readonly step: StepDescriptor;
  readonly failure: FailureWithError;
}

async function scan(
  journey: Journey,
  steps: readonly StepDescriptor[],
): Promise<Failing | undefined> {
  for (const step of steps) {
    journey.step = step.name;
    const failing = await attempted(journey, step, Attempt.first);
    if (failing !== undefined) {
      return failing;
    }
  }
  return undefined;
}

/**
 * Runs `attempt` of the step, then the attempts after it, until the step
 * succeeds or is given up.
 */
async function attempted(
  journey: Journey,
  step: StepDescriptor,
  attempt: Attempt,
): Promise<Failing | undefined> {
  await journey.emit({
    kind: EventKind.AttemptStarted,
    step: step.name,
    attempt,
  });
  const ended = await ran(journey, step, built(journey, step));
  if (ended === undefined) {
    await journey.emit({
      kind: EventKind.StepSucceeded,
      step: step.name,
      attempt,
    });
    return undefined;
  }
  const errorMessage = messageOf(ended.error);
  await journey.emit({
    kind: EventKind.StepAbnormalTermination,
    step: step.name,
    attempt,
    errorMessage,
  });
  const decision = afterAbnormalTermination(step, attempt);
  if (decision.kind === "retry") {
    await journey.emit({
      kind: EventKind.StepRetrying,
      step: step.name,
      attempt,
      cause: RetryCause.AbnormalTermination,
      decidedBy: "default",
    });
    return attempted(journey, step, nextAttempt(attempt));
  }
  await journey.emit({
    kind: EventKind.StepGivenUp,
    step: step.name,
    attempt,
    cause: decision.cause,
    decidedBy: "default",
  });
  return {
    step,
    failure: { cause: decision.cause, error: ended.error, errorMessage },
  };
}

/**
 * The step built for one attempt.
 *
 * @throws JourneyAbortError, aborting the journey with `step could not be
 * built`, when its constructor fails.
 */
function built(journey: Journey, step: StepDescriptor): Step {
  try {
    return step.build();
  } catch (error) {
    if (error instanceof JourneyAbortError) {
      throw error;
    }
    throw journey.abort({
      reason: AbortReason.StepCouldNotBeBuilt,
      step: step.name,
      source: { kind: "step" },
      errorMessage: messageOf(error),
      error,
    });
  }
}

/**
 * Runs the step built for an attempt. Gives nothing when it succeeded, and
 * the error that ended it in an abnormal termination otherwise: what its
 * `run` threw, or an error saying what it returned that is not an outcome.
 *
 * @throws JourneyAbortError when the journey was aborted while it ran,
 * whatever it did afterwards.
 */
async function ran(
  journey: Journey,
  step: StepDescriptor,
  made: Step,
): Promise<{ readonly error: unknown } | undefined> {
  const before = journey.recorded;
  let ended: { readonly error: unknown } | undefined;
  try {
    const returned: unknown = await made.run();
    ended = isOutcome(returned)
      ? undefined
      : { error: new TypeError(notAnOutcome(step, returned)) };
  } catch (error) {
    ended = { error };
  }
  const recorded = journey.recorded;
  if (recorded !== undefined && recorded !== before) {
    throw new JourneyAbortError(recorded);
  }
  return ended;
}

function notAnOutcome(step: StepDescriptor, returned: unknown): string {
  return `step ${step.name} returned ${typeof returned}, not an outcome made with its helpers`;
}
