import { FailureCause } from "../journey.js";
import { RetryCause } from "../policy.js";
import type { Attempt, StepDescriptor } from "../step.js";

/**
 * Why the executor's own rule gives a step up: never `FailWorkflow`, which
 * only a hook returns.
 */
export type GiveUpCause = Exclude<
  FailureCause,
  typeof FailureCause.FailWorkflow
>;

/**
 * What the executor decides by its own rule once an attempt of a step failed
 * or ended in an abnormal termination: attempt the step again, or give it up
 * with a cause.
 */
export type AfterFailedAttempt =
  | { readonly kind: "retry" }
  | { readonly kind: "give up"; readonly cause: GiveUpCause };

/**
 * Decides, by the executor's own rule, what follows `attempt` of the step
 * `step` describes, which ended for `cause`: a retry while its budget allows
 * another attempt, unless it ended in an abnormal termination and the step
 * does not retry those. Otherwise the step is given up: its budget
 * exhausted when it had one and was retried, or for the cause itself.
 */
export function afterFailedAttempt(
  step: StepDescriptor,
  attempt: Attempt,
  cause: RetryCause,
): AfterFailedAttempt {
  const itself = givenUpFor(cause);
  if (
    step.retryBudget === 0 ||
    (cause === RetryCause.AbnormalTermination &&
      !step.retryOnAbnormalTermination)
  ) {
    return itself;
  }
  return attempt.number <= step.retryBudget
    ? { kind: "retry" }
    : { kind: "give up", cause: FailureCause.RetriesExhausted };
}

function givenUpFor(cause: RetryCause): AfterFailedAttempt {
  return {
    kind: "give up",
    cause:
      cause === RetryCause.Failure
        ? FailureCause.Failure
        : FailureCause.AbnormalTermination,
  };
}
