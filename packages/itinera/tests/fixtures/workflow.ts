import type { Request } from "../../src/declaration/request.js";
import type { PolicyDescriptor } from "../../src/policy/descriptor.js";
import type { ProviderName, ServiceType } from "../../src/service.js";
import type { DeclaredProvider } from "../../src/service/provider.js";
import { serviceType } from "../../src/service/request.js";
import type { StepDescriptor } from "../../src/step.js";
import { describeStep } from "../../src/step/descriptor.js";
import { Refund, Ship } from "./step.js";
import type { DeclaredAdapter } from "../../src/workflow/adapter.js";
import type { AdapterName } from "../../src/workflow/names.js";

/** A type of service for payments. */
export const PAYMENTS = serviceType<string>("Payments");

/** Another type of service, for stock. */
export const STOCK = serviceType<number>("Stock");

/** What a step of the tests has, besides its name. */
export interface Parts {
  /** The keys and types of the services its `run` requests, in order. */
  readonly services?: readonly (readonly [string, ServiceType<unknown>])[];
  /** Its retry budget. */
  readonly retryBudget?: number;
  /** Its step policies. */
  readonly policies?: PolicyDescriptor[];
  /** The services its rescue step requests, when it has one. */
  readonly rescue?: readonly (readonly [string, ServiceType<unknown>])[];
}

/** A step named `name`, with what `parts` says. */
export function step(name: string, parts: Parts = {}): StepDescriptor {
  const { rescue, services = [], ...rest } = parts;
  return describeStep(Ship, {
    name,
    ...rest,
    rescue:
      rescue === undefined
        ? undefined
        : { step: Refund, requests: { needs: [], run: rescue.map(request) } },
    requests: { needs: [], run: services.map(request) },
  });
}

/** An input adapter named `name`, attached to `steps`. */
export function adapter(name: string, ...steps: string[]): DeclaredAdapter {
  return { name: name as AdapterName, steps, key: name, requests: [] };
}

/** A service provider named `name`, of the key `key`, as `parts` says. */
export function provider(
  name: string,
  parts: Partial<DeclaredProvider> = {},
): DeclaredProvider {
  return {
    name: name as ProviderName,
    serviceKey: "payments",
    type: PAYMENTS,
    scope: "attempt",
    steps: undefined,
    key: name,
    requests: [],
    ...parts,
  };
}

function request([key, type]: readonly [
  string,
  ServiceType<unknown>,
]): Request {
  return { kind: "service", key, type };
}
