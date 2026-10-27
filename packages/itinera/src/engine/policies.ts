import { Refusal } from "../executor/refusal.js";
import { AbortReason } from "../journey.js";
import {
  type PolicyDescriptor,
  StepPolicy,
  WorkflowPolicy,
} from "../policy.js";
import type { Hook } from "../policy/hooks.js";
import type { StepDescriptor } from "../step.js";
import type { WorkflowDescriptor } from "../workflow.js";
import type { Journey } from "./journey.js";
import { messageOf } from "./message.js";
import { isOf, whatIs } from "./returned.js";

/** A policy built for an attempt or for a journey, with its descriptor. */
export interface BuiltPolicy {
  /** How the policy is described. */
  readonly descriptor: PolicyDescriptor;
  /** The instance built. */
  readonly policy: StepPolicy | WorkflowPolicy;
}

/**
 * The step policies attached to the step, each built anew for one of its
 * attempts, in the order they are attached.
 *
 * @throws JourneyAbortError, aborting the journey with `policy could not be
 * built` when one fails while it is built, or with `unexpected result` when
 * its constructor returns another object.
 */
export function stepPolicies(
  journey: Journey,
  step: StepDescriptor,
): readonly BuiltPolicy[] {
  return step
    .policies()
    .map((descriptor) => builtForStep(journey, step, descriptor));
}

/**
 * The workflow policies attached to the workflow, each built once for the
 * journey, in the order they are attached.
 *
 * @throws Refusal when one fails while it is built, or its constructor
 * returns another object.
 */
export function workflowPolicies(
  workflow: WorkflowDescriptor,
): readonly BuiltPolicy[] {
  return workflow.policies().map(builtForJourney);
}

/** The policy among `policies` that defines `hook`, if one does. */
export function defining(
  policies: readonly BuiltPolicy[],
  hook: Hook,
): BuiltPolicy | undefined {
  return policies.find((built) => defines(built, hook));
}

function defines(built: BuiltPolicy, hook: Hook): boolean {
  return built.descriptor.hooks().includes(hook);
}

function builtForStep(
  journey: Journey,
  step: StepDescriptor,
  descriptor: PolicyDescriptor,
): BuiltPolicy {
  let policy: unknown;
  try {
    policy = descriptor.build();
  } catch (error) {
    throw journey.abort({
      reason: AbortReason.PolicyCouldNotBeBuilt,
      step: step.name,
      policy: descriptor.name,
      errorMessage: messageOf(error),
      error,
    });
  }
  if (!isOf(policy, StepPolicy)) {
    throw journey.abort({
      reason: AbortReason.UnexpectedResult,
      step: step.name,
      source: { kind: "policy", policy: descriptor.name },
      message: notThePolicy(descriptor, policy),
    });
  }
  return { descriptor, policy };
}

function builtForJourney(descriptor: PolicyDescriptor): BuiltPolicy {
  let policy: unknown;
  try {
    policy = descriptor.build();
  } catch (error) {
    throw new Refusal({
      kind: "workflow policy failed",
      policy: descriptor.name,
      error,
      errorMessage: messageOf(error),
    });
  }
  if (!isOf(policy, WorkflowPolicy)) {
    throw new Refusal({
      kind: "unexpected result",
      source: { kind: "workflow policy", policy: descriptor.name },
      message: notThePolicy(descriptor, policy),
    });
  }
  return { descriptor, policy };
}

function notThePolicy(descriptor: PolicyDescriptor, policy: unknown): string {
  return `the constructor of policy ${descriptor.name} returned ${whatIs(policy)}, not the policy`;
}
