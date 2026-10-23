import type { DecidingHook, StepSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import { FailureCause, type FailureWithError } from "../journey.js";
import { None } from "../option.js";
import { RetryCause, StepHook } from "../policy.js";
import type { Reason } from "../step.js";
import type { PlainValue } from "../value.js";
import { committed } from "./commit.js";
import { type Attempting, stepHookCalled } from "./hook/step.js";
import { messageOf } from "./message.js";
import { decided, givenUpByHook, leftBy } from "./outcome/failed.js";
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

/** Why a hook made a journey fail: the reason of its `FailWorkflow`. */
interface FailedByHook {
  /** Always `FailWorkflow`. */
  readonly cause: typeof FailureCause.FailWorkflow;
  /** The reason `FailWorkflow` carried. */
  readonly reason: Reason;
  /** The policy and hook that returned it. */
  readonly decidedBy: DecidingHook;
}

/** Why a journey fails, by the executor's own rule or by a hook. */
export type Failing = FailedByDefault | FailedByHook;

/**
 * What follows an attempt: the next step, another attempt of the same step,
 * the journey succeeding at once, or the step given up, with why the journey
 * fails.
 */
export type Concluded =
  | { readonly kind: "next step" }
  | { readonly kind: "retry" }
  | {
      readonly kind: "finish";
      readonly decidedBy: DecidingHook<typeof StepHook.OnStepSuccess>;
    }
  | { readonly kind: "given up"; readonly failing: Failing };

/**
 * Reports how the attempt ended, and acts on it, calling the step hooks in
 * their order: a success commits what the attempt contributed before
 * `on step success`, a skip discards it and calls no hook, and a failure or
 * an abnormal termination is decided by the executor's own rule and the
 * hooks.
 *
 * @throws JourneyAbortError once the journey is aborted.
 */
export async function concluded(
  attempting: Attempting,
  ran: Ran,
): Promise<Concluded> {
  if (ran.kind === "abnormal termination") {
    return terminated(attempting, ran.error);
  }
  const { journey, step, attempt } = attempting;
  const { outcome, contributed } = ran;
  switch (outcome.kind) {
    case "success": {
      await journey.emit({
        kind: EventKind.StepSucceeded,
        step: step.name,
        attempt,
      });
      const source: StepSource = { kind: "step", step: step.name, attempt };
      await committed(journey, source, contributed);
      return succeeded(attempting, contributed);
    }
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
      return decided(
        attempting,
        { cause: RetryCause.Failure, reason: outcome.reason },
        contributed,
      );
  }
}

/**
 * Calls `on step success`: the next step by default, or the journey ending
 * at once as the lifecycle it returned says.
 */
async function succeeded(
  attempting: Attempting,
  contributed: ReadonlyMap<string, PlainValue>,
): Promise<Concluded> {
  const hook = StepHook.OnStepSuccess;
  const returned = await stepHookCalled(attempting, hook, {
    contributed,
    reason: None,
    error: None,
    cause: None,
  });
  if (returned === undefined) {
    return { kind: "next step" };
  }
  const { policy, lifecycle } = returned;
  const decidedBy = { policy, hook };
  return lifecycle.kind === "FinishWorkflow"
    ? { kind: "finish", decidedBy }
    : {
        kind: "given up",
        failing: {
          cause: FailureCause.FailWorkflow,
          reason: lifecycle.reason,
          decidedBy,
        },
      };
}

/**
 * Reports the abnormal termination and calls `on step abnormal termination`,
 * which gives the step up when it fails the workflow; otherwise the
 * executor's own rule and the hooks decide, as after a failure.
 */
async function terminated(
  attempting: Attempting,
  error: unknown,
): Promise<Concluded> {
  const { journey, step, attempt } = attempting;
  const errorMessage = messageOf(error);
  await journey.emit({
    kind: EventKind.StepAbnormalTermination,
    step: step.name,
    attempt,
    errorMessage,
  });
  const failed = { cause: RetryCause.AbnormalTermination, error, errorMessage };
  const nothing = new Map<string, PlainValue>();
  const hook = StepHook.OnStepAbnormalTermination;
  const returned = await stepHookCalled(
    attempting,
    hook,
    leftBy(failed, nothing, None),
  );
  return returned?.lifecycle.kind === "FailWorkflow"
    ? givenUpByHook(attempting, hook, returned.policy, returned.lifecycle)
    : decided(attempting, failed, nothing);
}
