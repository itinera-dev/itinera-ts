import { EventKind } from "../event/kind.js";
import type { WorkflowInstance } from "../instance.js";
import { Attempt, type StepDescriptor } from "../step.js";
import { nextAttempt } from "../step/attempt.js";
import { built } from "./build.js";
import type { Journey } from "./journey.js";
import { concluded, type FailedByDefault } from "./outcome.js";
import { ran } from "./run.js";

/**
 * Runs the journey: starts it, runs its steps in their order, each attempted
 * until it is done or the journey ends, then says how the journey ended.
 * Returns why it failed, when it failed.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function travel(
  journey: Journey,
  instance: WorkflowInstance,
): Promise<FailedByDefault | undefined> {
  await journey.emit({
    kind: EventKind.JourneyStarted,
    initialKeys: [...journey.data.keys()],
  });
  const failing = await scan(journey, instance);
  journey.step = undefined;
  if (failing === undefined) {
    await journey.emit({
      kind: EventKind.JourneySucceeded,
      decidedBy: "default",
    });
    return undefined;
  }
  const { step, failure } = failing;
  await journey.emit(
    failure.reason !== undefined
      ? {
          kind: EventKind.JourneyFailed,
          step: step.name,
          cause: failure.cause,
          reason: failure.reason,
          decidedBy: "default",
        }
      : {
          kind: EventKind.JourneyFailed,
          step: step.name,
          cause: failure.cause,
          errorMessage: failure.errorMessage,
          decidedBy: "default",
        },
  );
  return failure;
}

/** A step given up, and why the journey fails. */
interface Failing {
  readonly step: StepDescriptor;
  readonly failure: FailedByDefault;
}

async function scan(
  journey: Journey,
  instance: WorkflowInstance,
): Promise<Failing | undefined> {
  for (const step of instance.descriptor.steps()) {
    journey.step = step.name;
    const failing = await attempted(journey, instance, step, Attempt.first);
    if (failing !== undefined) {
      return failing;
    }
  }
  return undefined;
}

/**
 * Runs `attempt` of the step, then the attempts after it, until the step
 * is done or given up.
 */
async function attempted(
  journey: Journey,
  instance: WorkflowInstance,
  step: StepDescriptor,
  attempt: Attempt,
): Promise<Failing | undefined> {
  await journey.emit({
    kind: EventKind.AttemptStarted,
    step: step.name,
    attempt,
  });
  const made = await built(journey, instance, step, attempt);
  const ended = await ran(journey, step, attempt, made);
  const next = await concluded(journey, step, attempt, ended);
  switch (next.kind) {
    case "next step":
      return undefined;
    case "retry":
      return attempted(journey, instance, step, nextAttempt(attempt));
    case "given up":
      return { step, failure: next.failure };
  }
}
