import { FailureCause } from "../journey.js";
import type { Attempt, StepDescriptor } from "../step.js";

/**
 * What the executor decides by its own rule once an attempt of a step ended
 * in an abnormal termination: attempt the step again, or give it up with a
 * cause.
 */
export type AfterAbnormalTermination =
  | { readonly kind: "retry" }
  | {
      readonly kind: "give up";
      readonly cause:
        | typeof FailureCause.AbnormalTermination
        | typeof FailureCause.RetriesExhausted;
    };

/**
 * Decides, by the executor's own rule, what follows the abnormal
 * termination of `attempt` of the step `step` describes: a retry while the
 * step retries abnormal terminations and its budget allows another attempt;
 * otherwise the step is given up, its budget exhausted when it had one and
 * retried, or for the abnormal termination itself.
 */
export function afterAbnormalTermination(
  step: StepDescriptor,
  attempt: Attempt,
): AfterAbnormalTermination {
  if (!step.retryOnAbnormalTermination || step.retryBudget === 0) {
    return { kind: "give up", cause: FailureCause.AbnormalTermination };
  }
  return attempt.number <= step.retryBudget
    ? { kind: "retry" }
    : { kind: "give up", cause: FailureCause.RetriesExhausted };
}
