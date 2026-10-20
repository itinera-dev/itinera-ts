import type { DecidedBy } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { WorkflowInstance } from "../instance.js";
import { FailureCause, type Failure } from "../journey.js";
import { StepHook, WorkflowHook } from "../policy.js";
import { Attempt, type StepDescriptor, type StepName } from "../step.js";
import { nextAttempt } from "../step/attempt.js";
import { built } from "./build.js";
import { ofStep } from "./buildable.js";
import type { EventBody } from "./emitter.js";
import { workflowHookCalled } from "./hook/workflow.js";
import type { Journey } from "./journey.js";
import { concluded, type Failing } from "./outcome.js";
import { stepPolicies, type BuiltPolicy } from "./policies.js";
import { rescued } from "./rescue.js";
import { ran } from "./run.js";

/**
 * Runs the journey: starts it, runs its steps in their order, each attempted
 * until it is done or the journey ends, then calls the workflow hook for how
 * it ended and says how it ended. Returns why it failed, when it failed.
 * `policies` are the workflow policies built for the journey.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function travel(
  journey: Journey,
  instance: WorkflowInstance,
  policies: readonly BuiltPolicy[],
): Promise<Failure | undefined> {
  await journey.emit({
    kind: EventKind.JourneyStarted,
    initialKeys: [...journey.data.keys()],
  });
  const ended = await scan(journey, instance);
  journey.step = undefined;
  if (ended.kind === "succeeded") {
    const hook = WorkflowHook.OnWorkflowSuccess;
    await workflowHookCalled(journey, instance, policies, hook);
    await journey.emit({
      kind: EventKind.JourneySucceeded,
      decidedBy: ended.decidedBy,
    });
    return undefined;
  }
  const hook = WorkflowHook.OnWorkflowFailure;
  await workflowHookCalled(journey, instance, policies, hook);
  await journey.emit(journeyFailed(ended.step, ended.failing));
  return failureOf(ended.failing);
}

/**
 * How the steps ended: the journey succeeded, after its last step or through
 * a hook, or a step, or a rescue step, was given up, and why the journey
 * fails.
 */
type Ended =
  | {
      readonly kind: "succeeded";
      readonly decidedBy: DecidedBy<typeof StepHook.OnStepSuccess>;
    }
  | {
      readonly kind: "failed";
      readonly step: StepName;
      readonly failing: Failing;
    };

async function scan(
  journey: Journey,
  instance: WorkflowInstance,
): Promise<Ended> {
  for (const step of instance.descriptor.steps()) {
    journey.step = step.name;
    const ended = await attempted(journey, instance, step, Attempt.first);
    if (ended !== undefined) {
      return ended;
    }
  }
  return { kind: "succeeded", decidedBy: "default" };
}

/**
 * Runs `attempt` of the step, with its step policies built anew, then the
 * attempts after it, until the step is done, given up, or ends the journey.
 * An attempt handed to the step's rescue step is followed by the rescue
 * step, then, once it succeeded, by the step's next attempt.
 */
async function attempted(
  journey: Journey,
  instance: WorkflowInstance,
  step: StepDescriptor,
  attempt: Attempt,
): Promise<Ended | undefined> {
  await journey.emit({
    kind: EventKind.AttemptStarted,
    step: step.name,
    attempt,
  });
  const policies = stepPolicies(journey, step);
  const buildable = ofStep(step);
  const builtStep = await built(journey, instance, buildable, attempt);
  const ended = await ran(journey, buildable, attempt, builtStep);
  const next = await concluded(
    { journey, instance, step, attempt, policies },
    ended,
  );
  switch (next.kind) {
    case "next step":
      return undefined;
    case "rescue": {
      const { rescue, left } = next;
      const failing = await rescued(journey, instance, {
        step,
        attempt,
        rescue,
        left,
      });
      return failing === undefined
        ? attempted(journey, instance, step, nextAttempt(attempt))
        : { kind: "failed", step: rescue.name, failing };
    }
    case "retry":
      return attempted(journey, instance, step, nextAttempt(attempt));
    case "finish":
      return { kind: "succeeded", decidedBy: next.decidedBy };
    case "given up":
      return { kind: "failed", step: step.name, failing: next.failing };
  }
}

function journeyFailed(step: StepName, failing: Failing): EventBody {
  const kind = EventKind.JourneyFailed;
  if (failing.cause === FailureCause.FailWorkflow) {
    const { cause, reason, decidedBy } = failing;
    return { kind, step, cause, reason, decidedBy };
  }
  return failing.reason !== undefined
    ? {
        kind,
        step,
        cause: failing.cause,
        reason: failing.reason,
        decidedBy: "default",
      }
    : {
        kind,
        step,
        cause: failing.cause,
        errorMessage: failing.errorMessage,
        decidedBy: "default",
      };
}

/** Why the journey failed, as its result tells it. */
function failureOf(failing: Failing): Failure {
  if (failing.cause !== FailureCause.FailWorkflow) {
    return failing;
  }
  const { cause, reason } = failing;
  return { cause, reason };
}
