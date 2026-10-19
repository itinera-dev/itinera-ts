import type { StepSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import { FailureCause, type FailureWithError } from "../journey.js";
import { RetryCause } from "../policy.js";
import type { Attempt, Reason, StepDescriptor } from "../step.js";
import type { PlainValue } from "../value.js";
import { afterFailedAttempt, type GiveUpCause } from "./decision.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import type { Ran } from "./run.js";

/**
 * Why the executor's own rule makes a journey fail: the reason of the last
 * attempt, when it reported a failure, or the error that ended it.
 */
export type FailedByDefault =
  | {
      readonly cause:
        typeof FailureCause.Failure | typeof FailureCause.RetriesExhausted;
      readonly reason: Reason;
    }
  | FailureWithError;

/**
 * What follows an attempt: the next step, another attempt of the same step,
 * or the step given up, with why the journey fails.
 */
export type Concluded =
  | { readonly kind: "next step" }
  | { readonly kind: "retry" }
  | { readonly kind: "given up"; readonly failure: FailedByDefault };

/** How an attempt failed, with the reason or the error it carries. */
type Failed =
  | { readonly cause: typeof RetryCause.Failure; readonly reason: Reason }
  | {
      readonly cause: typeof RetryCause.AbnormalTermination;
      readonly error: unknown;
      readonly errorMessage: string;
    };

/**
 * Reports how `attempt` of the step ended, and acts on it: a success commits
 * what the attempt contributed, a skip discards it, and a failure or an
 * abnormal termination is decided by the executor's own rule.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function concluded(
  journey: Journey,
  step: StepDescriptor,
  attempt: Attempt,
  ran: Ran,
): Promise<Concluded> {
  const source: StepSource = { kind: "step", step: step.name, attempt };
  if (ran.kind === "abnormal termination") {
    const errorMessage = messageOf(ran.error);
    await journey.emit({
      kind: EventKind.StepAbnormalTermination,
      step: step.name,
      attempt,
      errorMessage,
    });
    return decided(journey, step, attempt, {
      cause: RetryCause.AbnormalTermination,
      error: ran.error,
      errorMessage,
    });
  }
  const { outcome, contributed } = ran;
  switch (outcome.kind) {
    case "success":
      await journey.emit({
        kind: EventKind.StepSucceeded,
        step: step.name,
        attempt,
      });
      await committed(journey, source, contributed);
      return { kind: "next step" };
    case "skipped":
      await journey.emit({
        kind: EventKind.StepSkipped,
        step: step.name,
        attempt,
        ...(outcome.reason === undefined ? {} : { reason: outcome.reason }),
      });
      await journey.emit({
        kind: EventKind.ContributionsDiscarded,
        step: step.name,
        attempt,
      });
      return { kind: "next step" };
    case "failure":
      await journey.emit({
        kind: EventKind.StepFailed,
        step: step.name,
        attempt,
        reason: outcome.reason,
      });
      return decided(journey, step, attempt, {
        cause: RetryCause.Failure,
        reason: outcome.reason,
      });
  }
}

/**
 * Commits each contribution to the data bag, in order, reporting each, and
 * each value it replaced.
 */
async function committed(
  journey: Journey,
  source: StepSource,
  contributed: ReadonlyMap<string, PlainValue>,
): Promise<void> {
  for (const [key, value] of contributed) {
    const replaced = journey.commit(key, value);
    await journey.emit({ kind: EventKind.ContributionCommitted, key, source });
    if (replaced) {
      await journey.emit({ kind: EventKind.DataOverwritten, key, source });
    }
  }
}

async function decided(
  journey: Journey,
  step: StepDescriptor,
  attempt: Attempt,
  failed: Failed,
): Promise<Concluded> {
  const decision = afterFailedAttempt(step, attempt, failed.cause);
  if (decision.kind === "retry") {
    await journey.emit({
      kind: EventKind.StepRetrying,
      step: step.name,
      attempt,
      cause: failed.cause,
      decidedBy: "default",
    });
    return { kind: "retry" };
  }
  await journey.emit({
    kind: EventKind.StepGivenUp,
    step: step.name,
    attempt,
    cause: decision.cause,
    decidedBy: "default",
  });
  return { kind: "given up", failure: failureOf(decision.cause, failed) };
}

function failureOf(cause: GiveUpCause, failed: Failed): FailedByDefault {
  const exhausted = cause === FailureCause.RetriesExhausted;
  if (failed.cause === RetryCause.Failure) {
    return {
      cause: exhausted ? FailureCause.RetriesExhausted : FailureCause.Failure,
      reason: failed.reason,
    };
  }
  return {
    cause: exhausted
      ? FailureCause.RetriesExhausted
      : FailureCause.AbnormalTermination,
    error: failed.error,
    errorMessage: failed.errorMessage,
  };
}
