import type { WorkflowInstance } from "../../instance.js";
import type { WorkflowHook } from "../../policy.js";
import { hookCalled } from "../hook.js";
import type { Journey } from "../journey.js";
import { type BuiltPolicy, defining } from "../policies.js";

/**
 * Calls the workflow hook `hook` of the workflow policy built for the
 * journey that defines it, if one does.
 *
 * @throws JourneyAbortError as calling any hook does.
 */
export async function workflowHookCalled(
  journey: Journey,
  instance: WorkflowInstance,
  policies: readonly BuiltPolicy[],
  hook: WorkflowHook,
): Promise<void> {
  const built = defining(policies, hook);
  if (built !== undefined) {
    await hookCalled({
      journey,
      instance,
      built,
      hook: { kind: "workflow hook", policy: built.descriptor.name, hook },
    });
  }
}
