import { marking } from "../declaration.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { JourneyId } from "../journey.js";
import type { StepPolicy, WorkflowPolicy } from "../policy.js";

/**
 * Requests the ID of the journey, in a hook.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function journeyId(): RequestDecorator<
  JourneyId,
  Place<StepPolicy | WorkflowPolicy, string | symbol>
> {
  return marking(() => ({ kind: "journeyId" }));
}
