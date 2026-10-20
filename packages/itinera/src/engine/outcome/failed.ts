import { type GiveUpHook, RescueCause } from "../../event.js";
import { EventKind } from "../../event/kind.js";
import { FailureCause } from "../../journey.js";
import { None, type Option, Some } from "../../option.js";
import {
  type FailWorkflow,
  type PolicyName,
  RetryCause,
  type StepFailureCause,
  StepHook,
} from "../../policy.js";
import type { Reason } from "../../step.js";
import type { PlainValue } from "../../value.js";
import { afterFailedAttempt, type GiveUpCause } from "../decision.js";
import type { Left } from "../hook.js";
import { type Attempting, stepHookCalled } from "../hook/step.js";
import type { Concluded, FailedByDefault } from "../outcome.js";

/** How an attempt failed, with the reason or the error it carries. */
export type Failed =
  | { readonly cause: typeof RetryCause.Failure; readonly reason: Reason }
  | {
      readonly cause: typeof RetryCause.AbnormalTermination;
      readonly error: unknown;
      readonly errorMessage: string;
    };

/**
 * Decides what follows an attempt that failed, as `failed` says, having
 * contributed `contributed`. When the executor's own rule rescues the step,
 * `step_rescuing` is recorded and no hook is called: the attempt and what it
 * left are handed to the rescue step. While the rule allows a retry,
 * `on step retry` is called before `step_retrying`, and gives the step up
 * when it fails the workflow. Otherwise the step is given up, then
 * `on step failure` is called, and decides why the journey fails when it
 * fails the workflow.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function decided(
  attempting: Attempting,
  failed: Failed,
  contributed: ReadonlyMap<string, PlainValue>,
): Promise<Concluded> {
  const { journey, step, attempt } = attempting;
  const decision = afterFailedAttempt(step, attempt, failed.cause);
  if (decision.kind === "rescue") {
    const { rescue } = decision;
    await journey.emit({
      kind: EventKind.StepRescuing,
      step: step.name,
      attempt,
      cause: rescueCauseOf(failed),
      rescue: rescue.name,
      decidedBy: "default",
    });
    return { kind: "rescue", rescue, left: leftBy(failed, contributed, None) };
  }
  if (decision.kind === "retry") {
    const hook = StepHook.OnStepRetry;
    const returned = await stepHookCalled(
      attempting,
      hook,
      leftBy(failed, contributed, Some(failed.cause)),
    );
    if (returned?.lifecycle.kind === "FailWorkflow") {
      return givenUpByHook(
        attempting,
        hook,
        returned.policy,
        returned.lifecycle,
      );
    }
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
  const hook = StepHook.OnStepFailure;
  const returned = await stepHookCalled(
    attempting,
    hook,
    leftBy(failed, contributed, Some(decision.cause)),
  );
  return {
    kind: "given up",
    failing:
      returned?.lifecycle.kind === "FailWorkflow"
        ? {
            cause: FailureCause.FailWorkflow,
            reason: returned.lifecycle.reason,
            decidedBy: { policy: returned.policy, hook },
          }
        : failureOf(decision.cause, failed),
  };
}

/**
 * Gives the step up because its hook `hook`, of the policy `policy`,
 * returned `lifecycle`: the journey fails for its reason.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function givenUpByHook(
  { journey, step, attempt }: Attempting,
  hook: GiveUpHook,
  policy: PolicyName,
  { reason }: FailWorkflow,
): Promise<Concluded> {
  const decidedBy = { policy, hook };
  await journey.emit({
    kind: EventKind.StepGivenUp,
    step: step.name,
    attempt,
    cause: FailureCause.FailWorkflow,
    reason,
    decidedBy,
  });
  return {
    kind: "given up",
    failing: { cause: FailureCause.FailWorkflow, reason, decidedBy },
  };
}

/**
 * What an attempt that failed as `failed` says, having contributed
 * `contributed`, leaves for a hook called for `cause`.
 */
export function leftBy(
  failed: Failed,
  contributed: ReadonlyMap<string, PlainValue>,
  cause: Option<StepFailureCause | RetryCause>,
): Left {
  return failed.cause === RetryCause.Failure
    ? { contributed, reason: Some(failed.reason), error: None, cause }
    : { contributed, reason: None, error: Some(failed.error), cause };
}

function rescueCauseOf({ cause }: Failed): RescueCause {
  return cause === RetryCause.Failure
    ? RescueCause.Failure
    : RescueCause.AbnormalTermination;
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
