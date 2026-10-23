import type { PolicyName, StepHook, WorkflowHook } from "../policy.js";
import type { ProviderName } from "../service.js";
import type { Attempt, StepName } from "../step.js";
import type { AdapterName } from "../workflow.js";

/**
 * A step, as an abort names who did or requested what caused it. The step
 * itself is the abort's own `step`.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByStep {
  /** Who it is. */
  readonly kind: "step";
}

/**
 * A rescue step, requesting the failure's reason or the error of the step it
 * rescues. The rescue step is the abort's own `step`.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByRescueStep {
  /** Who it is. */
  readonly kind: "rescue step";
}

/**
 * An input adapter, resolving one of a step's inputs.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByAdapter {
  /** Who it is. */
  readonly kind: "adapter";
  /** The adapter's name. */
  readonly adapter: AdapterName;
}

/**
 * An input adapter, with the key of the step's input it was resolving.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByAdapterForKey extends ByAdapter {
  /** The key of the input. */
  readonly key: string;
}

/**
 * A hook of a step policy, acting on a step.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByStepHook {
  /** Who it is. */
  readonly kind: "step hook";
  /** The policy's name. */
  readonly policy: PolicyName;
  /** The hook. */
  readonly hook: StepHook;
}

/**
 * A hook of a workflow policy, which acts on no step.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByWorkflowHook {
  /** Who it is. */
  readonly kind: "workflow hook";
  /** The policy's name. */
  readonly policy: PolicyName;
  /** The hook. */
  readonly hook: WorkflowHook;
}

/**
 * A service provider, supplying a step's service.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ByProvider {
  /** Who it is. */
  readonly kind: "provider";
  /** The provider's name. */
  readonly provider: ProviderName;
}

/** The step and attempt something happened in. */
interface During {
  /** The step's name. */
  readonly step: StepName;
  /** The attempt. */
  readonly attempt: Attempt;
}

/**
 * A step, during one of its attempts.
 *
 * {@includeCode ../../examples/source.ts}
 */
export interface StepSource extends ByStep, During {}

/**
 * An input adapter, resolving an input of a step for one of its attempts.
 *
 * {@includeCode ../../examples/source.ts}
 */
export interface AdapterSource extends ByAdapter, During {}

/**
 * A hook of a step policy, with the step and attempt that triggered it.
 *
 * {@includeCode ../../examples/source.ts}
 */
export interface StepHookSource extends ByStepHook, During {}

/**
 * A service provider, with the step and attempt it was building.
 *
 * {@includeCode ../../examples/source.ts}
 */
export interface ProviderSource extends ByProvider, During {}

/**
 * A hook that was called: a hook of a step policy, with the step and attempt
 * that triggered it, or a hook of a workflow policy.
 *
 * {@includeCode ../../examples/source.ts}
 */
export type HookSource = StepHookSource | ByWorkflowHook;

/**
 * Who emitted a `journey_info`, `journey_warning` or `journey_error` event: a
 * hook, or a service provider.
 *
 * {@includeCode ../../examples/source.ts}
 */
export type EmitterSource = HookSource | ProviderSource;

/**
 * Who made an optional request that had no value: a step for one of its
 * inputs, an input adapter, a hook or a service provider.
 *
 * {@includeCode ../../examples/source.ts}
 */
export type RequestSource = StepSource | AdapterSource | EmitterSource;

/**
 * Who made a contribution: a step, or a hook.
 *
 * {@includeCode ../../examples/source.ts}
 */
export type ContributionSource = StepSource | HookSource;

/**
 * Who set an entry of global metadata: a step, a hook or a service provider.
 *
 * {@includeCode ../../examples/source.ts}
 */
export type MetadataSource = StepSource | EmitterSource;
