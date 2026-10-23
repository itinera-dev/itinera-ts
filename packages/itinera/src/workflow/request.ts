import { markingValue } from "../declaration/marking.js";
import type { Place, ValueRequestDecorator } from "../declaration/parameter.js";
import type { StepPolicy, WorkflowPolicy } from "../policy.js";
import type { Workflow } from "../workflow.js";
import type { RequestType } from "../value/token.js";

/**
 * Requests data from the workflow, in a hook, an input adapter or a service
 * provider: the value under `key` in the data bag, checked by `type`. With
 * no type written, the parameter's own type is checked, as the compiler
 * records it, which it can say only for `number`, `string`, `boolean` and a
 * class that serialises itself.
 *
 * The data is required unless `type` is wrapped in `optional`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, if no type is written and the
 * compiler recorded none it can say.
 */
export function fromWorkflow<T extends RequestType | undefined = undefined>(
  key: string,
  type?: T,
): ValueRequestDecorator<
  T,
  Place<StepPolicy | WorkflowPolicy | Workflow, string | symbol>
> {
  return markingValue("fromWorkflow", key, type);
}
