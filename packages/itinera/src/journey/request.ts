import { marking } from "../declaration/marking.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { DataBag, JourneyId } from "../journey.js";
import type { StepPolicy, WorkflowPolicy } from "../policy.js";
import type { Workflow } from "../workflow.js";

/**
 * Requests the ID of the journey, in a hook, an input adapter or a service
 * provider.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function journeyId(): RequestDecorator<
  JourneyId,
  Place<StepPolicy | WorkflowPolicy | Workflow, string | symbol>
> {
  return marking({ kind: "journeyId" });
}

/**
 * Requests the data bag, in an input adapter, to read what it holds while
 * the step is built.
 *
 * {@includeCode ../../examples/input-adapter.ts}
 */
export function dataBag(): RequestDecorator<
  DataBag,
  Place<Workflow, string | symbol>
> {
  return marking({ kind: "dataBag" });
}
