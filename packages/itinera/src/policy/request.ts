import { marking, markingValue } from "../declaration/marking.js";
import type {
  Place,
  RequestDecorator,
  ValueRequestDecorator,
} from "../declaration/parameter.js";
import type { RetryCause, StepFailureCause } from "../policy.js";
import type { RequestType } from "../value/token.js";
import type { StepPolicy } from "./step-policy.js";
import type { WorkflowPolicy } from "./workflow-policy.js";

/**
 * Requests data from the step a step hook acts on: what the step contributed
 * under `key` in the attempt, committed or not, checked by `type`. With no
 * type written, the parameter's own type is checked, as the compiler records
 * it, which it can say only for `number`, `string`, `boolean` and a class
 * that serialises itself.
 *
 * The data is required unless `type` is wrapped in `optional`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, if no type is written and the
 * compiler recorded none it can say.
 */
export function fromStep<T extends RequestType | undefined = undefined>(
  key: string,
  type?: T,
): ValueRequestDecorator<T, Place<StepPolicy, string | symbol>> {
  return markingValue("fromStep", key, type);
}

/**
 * Requests the role `R`, in a hook: the workflow, through the operations of
 * `R`. It compiles only in a policy whose base class names `R` among its
 * roles, as `WorkflowPolicy<Messages>` does, and the policy compiles only on
 * a workflow that implements them.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R The role, an interface the workflow implements.
 */
export function role<R>(): RequestDecorator<
  R,
  Place<StepPolicy<R> | WorkflowPolicy<R>, string | symbol>
> {
  return marking({ kind: "role" });
}

/**
 * Requests, in `on step failure`, why its step was given up.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function failureCause(): RequestDecorator<
  StepFailureCause,
  Place<StepPolicy, string | symbol>
> {
  return marking({ kind: "failureCause" });
}

/**
 * Requests, in `on step retry`, why its step will be attempted again.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function retryCause(): RequestDecorator<
  RetryCause,
  Place<StepPolicy, string | symbol>
> {
  return marking({ kind: "retryCause" });
}
