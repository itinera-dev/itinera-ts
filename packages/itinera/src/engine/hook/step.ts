import type { WorkflowInstance } from "../../instance.js";
import type { Lifecycle, PolicyName, StepHook } from "../../policy.js";
import type { Attempt, StepDescriptor } from "../../step.js";
import { hookCalled, type Left } from "../hook.js";
import type { Journey } from "../journey.js";
import { type BuiltPolicy, defining } from "../policies.js";

/**
 * An attempt of a step being concluded: the journey and its instance, the
 * step, the attempt, and the step policies built for it.
 */
export interface Attempting {
  readonly journey: Journey;
  readonly instance: WorkflowInstance;
  readonly step: StepDescriptor;
  readonly attempt: Attempt;
  readonly policies: readonly BuiltPolicy[];
}

/** A lifecycle a step hook returned, with the name of its policy. */
interface Decided {
  /** The policy whose hook returned it. */
  readonly policy: PolicyName;
  /** What it returned. */
  readonly lifecycle: Lifecycle;
}

/**
 * Calls the step hook `hook` of the policy built for the attempt that
 * defines it, if one does, giving it what the attempt left. Gives the
 * lifecycle it returned, with its policy's name; none when no policy
 * defines it, or it kept the default.
 *
 * @throws JourneyAbortError as calling any hook does.
 */
export async function stepHookCalled(
  { journey, instance, step, attempt, policies }: Attempting,
  hook: StepHook,
  left: Left,
): Promise<Decided | undefined> {
  const built = defining(policies, hook);
  if (built === undefined) {
    return undefined;
  }
  const policy = built.descriptor.name;
  const lifecycle = await hookCalled({
    journey,
    instance,
    built,
    hook: { kind: "step hook", policy, hook, step: step.name, attempt },
    left,
  });
  return lifecycle === undefined ? undefined : { policy, lifecycle };
}
