import type { Service } from "../../declaration/request.js";
import type { ProviderName } from "../../service.js";
import type { DeclaredProvider } from "../../service/provider.js";
import { serving, servicesOf } from "../../service/serving.js";
import type { StepDescriptor, StepName } from "../../step.js";
import type { ViolationKind } from "../violation.js";
import { type Requesting, withRescueSteps } from "./steps.js";
import { grouped, repeated } from "./tally.js";

/**
 * A step, or a rescue step, requests a service that no provider serves for
 * it.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface ServiceNotProvided {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.ServiceNotProvided;
  /** The step, or the rescue step, that requests the service. */
  readonly step: StepName;
  /** The key of the service. */
  readonly key: string;
}

/**
 * A step, or a rescue step, requests the same key twice among its services.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface ServiceRequestedTwice {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.ServiceRequestedTwice;
  /** The step, or the rescue step, that requests the key. */
  readonly step: StepName;
  /** The key it requests twice. */
  readonly key: string;
}

/**
 * The provider serving a step, or a rescue step, supplies another type of
 * service than the step requests under its key.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface WrongServiceType {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.WrongServiceType;
  /** The step, or the rescue step, that requests the service. */
  readonly step: StepName;
  /** The key of the service. */
  readonly key: string;
  /** The provider that serves it. */
  readonly provider: ProviderName;
}

/** What is wrong with the services each step of `steps` requests. */
export function serviceViolations(
  steps: readonly StepDescriptor[],
  providers: readonly DeclaredProvider[],
): (ServiceRequestedTwice | ServiceNotProvided | WrongServiceType)[] {
  const requesting = withRescueSteps(steps);
  return [
    ...requesting.flatMap(servicesRequestedTwice),
    ...requesting.flatMap((step) => servedWrongly(step, providers)),
  ];
}

function servicesRequestedTwice(step: Requesting): ServiceRequestedTwice[] {
  return grouped(servicesOf(step.requests), keyOf)
    .filter(repeated)
    .map((group) => serviceRequestedTwice(step.name, group));
}

function servedWrongly(
  step: Requesting,
  providers: readonly DeclaredProvider[],
): (ServiceNotProvided | WrongServiceType)[] {
  return grouped(servicesOf(step.requests), keyOf).flatMap((group) =>
    servedWronglyFor(step.name, group, providers),
  );
}

function servedWronglyFor(
  step: StepName,
  [service]: readonly [Service, ...Service[]],
  providers: readonly DeclaredProvider[],
): (ServiceNotProvided | WrongServiceType)[] {
  const provider = serving(providers, step, service.key);
  if (provider === undefined) {
    return [{ kind: "service not provided", step, key: service.key }];
  }
  return provider.type === service.type
    ? []
    : [
        {
          kind: "wrong service type",
          step,
          key: service.key,
          provider: provider.name,
        },
      ];
}

function keyOf(service: Service): string {
  return service.key;
}

function serviceRequestedTwice(
  step: StepName,
  [service]: readonly [Service, ...Service[]],
): ServiceRequestedTwice {
  return { kind: "service requested twice", step, key: service.key };
}
