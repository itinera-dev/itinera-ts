import { EventKind } from "../event/kind.js";
import type { WorkflowInstance } from "../instance.js";
import { AbortReason, FailureCause } from "../journey.js";
import { Attempt, type StepDescriptor, type StepName } from "../step.js";
import type { Rescue } from "../step/descriptor.js";
import { built } from "./build.js";
import { ofRescue } from "./buildable.js";
import { committed } from "./commit.js";
import type { Left } from "./hook.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import type { FailedByDefault } from "./outcome.js";
import { ran, type Ran } from "./run.js";

/**
 * A step being rescued: the step, its attempt that failed, its rescue step,
 * and what that attempt left for the rescue step.
 */
interface Rescuing {
  readonly step: StepDescriptor;
  readonly attempt: Attempt;
  readonly rescue: Rescue;
  readonly left: Left;
}

/**
 * Runs the rescue step of a step whose attempt was handed to it, as the
 * rescue step's own attempt 1, built from what that attempt left: a success
 * commits what it contributed, then `step_rescued` is recorded for the step.
 * A rescue step has no policies, so no hook is called for it, and no retry
 * budget, so one that fails, or ends in an abnormal termination, is given up
 * at once. Returns why the journey fails, when the rescue step did not
 * succeed.
 *
 * @throws JourneyAbortError once the journey is aborted, and with `rescue
 * skipped` when the rescue step skips, once its contributions are discarded.
 */
export async function rescued(
  journey: Journey,
  instance: WorkflowInstance,
  { step, attempt, rescue, left }: Rescuing,
): Promise<FailedByDefault | undefined> {
  journey.step = rescue.name;
  const first = Attempt.first;
  await journey.emit({
    kind: EventKind.AttemptStarted,
    step: rescue.name,
    attempt: first,
  });
  const buildable = ofRescue(rescue, left);
  const ended = await ran(
    journey,
    buildable,
    first,
    await built(journey, instance, buildable, first),
  );
  const failing = await rescueEnded(journey, rescue, ended);
  if (failing !== undefined) {
    return failing;
  }
  journey.step = step.name;
  await journey.emit({
    kind: EventKind.StepRescued,
    step: step.name,
    attempt,
    rescue: rescue.name,
    decidedBy: "default",
  });
  return undefined;
}

/**
 * Reports how the rescue step's attempt ended, and acts on it: commits what
 * a success contributed, or gives the rescue step up, saying why the journey
 * fails.
 *
 * @throws JourneyAbortError once the journey is aborted, and with `rescue
 * skipped` when the rescue step skips.
 */
async function rescueEnded(
  journey: Journey,
  { name }: Rescue,
  ended: Ran,
): Promise<FailedByDefault | undefined> {
  const attempt = Attempt.first;
  if (ended.kind === "abnormal termination") {
    const errorMessage = messageOf(ended.error);
    await journey.emit({
      kind: EventKind.StepAbnormalTermination,
      step: name,
      attempt,
      errorMessage,
    });
    const cause = FailureCause.AbnormalTermination;
    await givenUp(journey, name, cause);
    return { cause, error: ended.error, errorMessage };
  }
  const { outcome, contributed } = ended;
  switch (outcome.kind) {
    case "success":
      await journey.emit({
        kind: EventKind.StepSucceeded,
        step: name,
        attempt,
      });
      await committed(
        journey,
        { kind: "step", step: name, attempt },
        contributed,
      );
      return undefined;
    case "failure": {
      const { reason } = outcome;
      await journey.emit({
        kind: EventKind.StepFailed,
        step: name,
        attempt,
        reason,
      });
      const cause = FailureCause.Failure;
      await givenUp(journey, name, cause);
      return { cause, reason };
    }
    case "skipped":
      await journey.emit({
        kind: EventKind.StepSkipped,
        step: name,
        attempt,
        ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
      });
      await journey.emit({
        kind: EventKind.ContributionsDiscarded,
        step: name,
        attempt,
      });
      throw journey.abort({ reason: AbortReason.RescueSkipped, step: name });
  }
}

function givenUp(
  journey: Journey,
  rescue: StepName,
  cause: typeof FailureCause.Failure | typeof FailureCause.AbnormalTermination,
): Promise<void> {
  return journey.emit({
    kind: EventKind.StepGivenUp,
    step: rescue,
    attempt: Attempt.first,
    cause,
    decidedBy: "default",
  });
}
