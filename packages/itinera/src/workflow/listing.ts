import type { Service } from "../declaration/request.js";
import type { PolicyName } from "../policy.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { ProviderName } from "../service.js";
import type { DeclaredProvider } from "../service/provider.js";
import { serving, servicesOf } from "../service/serving.js";
import type { StepDescriptor, StepName } from "../step.js";
import type { StepRequests } from "../step/declared.js";
import { requestsOfDescribed, rescueOf } from "../step/descriptor.js";
import { adapting, type DeclaredAdapter } from "./adapter.js";
import type { AdapterName } from "./names.js";

declare const position: unique symbol;

/**
 * Where a step stands in its workflow, counted from 1: the first step to run
 * is at position 1. Only itinera makes one, when it lists a workflow.
 *
 * {@includeCode ../../examples/listing.ts}
 */
export type Position = number & {
  /** Marks the number as a position counted by itinera. */
  readonly [position]: true;
};

/**
 * One step of a workflow, as its listing shows it, without running
 * anything.
 *
 * {@includeCode ../../examples/listing.ts}
 */
export interface ListedStep {
  /** The step's name. */
  readonly step: StepName;
  /** Where the step stands among the workflow's steps. */
  readonly position: Position;
  /** The names of the step's policies, in the order they were attached. */
  readonly policies: readonly PolicyName[];
  /** The name of the input adapter attached to the step, if one is. */
  readonly adapter?: AdapterName;
  /** The services the step requests, in the order it requests them. */
  readonly services: readonly ListedService[];
  /** The step's rescue section, if the step has a rescue step. */
  readonly rescue?: ListedRescue;
}

/**
 * The rescue section of a listed step: its rescue step, which has no
 * position, since it runs only when its step fails, and no policies.
 *
 * {@includeCode ../../examples/listing.ts}
 */
export interface ListedRescue {
  /** The rescue step's name, `<step name>_rescue`. */
  readonly step: StepName;
  /** The name of the input adapter attached to the rescue step, if one is. */
  readonly adapter?: AdapterName;
  /** The services the rescue step requests, in the order it requests them. */
  readonly services: readonly ListedService[];
}

/**
 * A service a listed step, or rescue step, requests, with the provider that
 * serves it.
 *
 * {@includeCode ../../examples/listing.ts}
 */
export interface ListedService {
  /** The key the step requests the service under. */
  readonly key: string;
  /** The name of the service provider that serves it. */
  readonly provider: ProviderName;
}

/** What a workflow's listing is read from. */
export interface Listed {
  /** The step descriptors, in the order the steps run. */
  readonly steps: readonly StepDescriptor[];
  /** The input adapters, in order. */
  readonly adapters: readonly DeclaredAdapter[];
  /** The service providers, in order. */
  readonly providers: readonly DeclaredProvider[];
}

/** The listing of the workflow put together from `listed`, step by step. */
export function listingOf(listed: Listed): ListedStep[] {
  return listed.steps.map((step, index) => listedStep(listed, step, index));
}

function listedStep(
  listed: Listed,
  step: StepDescriptor,
  index: number,
): ListedStep {
  const rescue = rescueOf(step);
  return {
    ...section(listed, step.name, requestsOfDescribed(step)),
    position: (index + 1) as Position,
    policies: step.policies().map(nameOf),
    ...(rescue === undefined
      ? {}
      : { rescue: section(listed, rescue.name, rescue.requests) }),
  };
}

function section(
  listed: Listed,
  step: StepName,
  requests: StepRequests,
): ListedRescue {
  const adapter = adapting(listed.adapters, step);
  return {
    step,
    ...(adapter === undefined ? {} : { adapter: adapter.name }),
    services: servicesOf(requests).flatMap((service) =>
      listedService(listed.providers, step, service),
    ),
  };
}

function nameOf(policy: PolicyDescriptor): PolicyName {
  return policy.name;
}

function listedService(
  providers: readonly DeclaredProvider[],
  step: StepName,
  service: Service,
): ListedService[] {
  const provider = serving(providers, step, service.key);
  return provider === undefined
    ? []
    : [{ key: service.key, provider: provider.name }];
}
