import { ModelError } from "./error.js";
import type { StepAction } from "./step.js";
import type { Scripted, ValueType } from "./value.js";

/** The service types the cases name: `labeller` and `meter`. */
export const serviceTypes = ["labeller", "meter"] as const;

/** A service type the cases name. */
export type ServiceTypeName = (typeof serviceTypes)[number];

/** The implementations of `labeller` the cases name. */
export const implementations = ["first labeller", "second labeller"] as const;

/** An implementation of `labeller` the cases name. */
export type Implementation = (typeof implementations)[number];

/** A service a step requests: its key and its service type. */
export interface ServiceRequest {
  readonly key: string;
  readonly type: ServiceTypeName;
}

/**
 * What a scenario says one scripted service provider does: the service it
 * provides, its scope and the steps it serves, what it requests, and what
 * it does on every call.
 */
export interface ProviderScript {
  readonly name: string;
  /** The key and the service type of the service it provides. */
  readonly service: ServiceRequest;
  readonly scope: "journey" | "attempt";
  /** The steps it serves, by name, once stated; otherwise it is attached to no step. */
  steps?: readonly [string, ...string[]];
  /** Its own requests, in the order their sentences are written. */
  readonly requests: ProviderRequest[];
  /** The events it emits and the global metadata it sets on every call, in order. */
  readonly actions: ProviderAction[];
  /** The key of the request whose string labels each instance, instead of its name and count. */
  labelsWith?: string;
  /** How it fails, once stated; otherwise it makes an instance. */
  failure?: ProviderFailure;
  /** The implementation of `labeller` each instance it makes is of. */
  implementation: Implementation;
  /** The data it supplies with each instance, once stated. */
  data?: Scripted;
  /** Whether it runs asynchronously. */
  asynchronous: boolean;
  /** The message every instance it makes fails with when used, once stated. */
  servicesFailWith?: string;
}

/** A request of a service provider, as the cases script one. */
export type ProviderRequest =
  | { readonly kind: "step name" }
  | { readonly kind: "attempt number" }
  | { readonly kind: "journey ID" }
  | {
      readonly kind: "data from the workflow";
      readonly key: string;
      readonly type: ValueType;
      readonly optional: boolean;
    };

/** Whether a request is the provider's request of data from the workflow under `key`. */
export function dataUnder(key: string): (request: ProviderRequest) => boolean {
  return (request) => isDataUnder(request, key);
}

function isDataUnder(request: ProviderRequest, key: string): boolean {
  return request.kind === "data from the workflow" && request.key === key;
}

/** What a service provider emits or sets on every call, as a hook does. */
export type ProviderAction = Extract<
  StepAction,
  { readonly kind: "emit" | "set global metadata" }
>;

/**
 * How a service provider fails: on every call, or only on a call where it
 * received `value` for the request of `key`.
 */
export interface ProviderFailure {
  readonly message: string;
  readonly when?: { readonly key: string; readonly value: string };
}

/** The service providers a scenario declares, in the order declared. */
export class Providers {
  /** Every provider, in the order declared, two of one name included. */
  readonly scripts: ProviderScript[] = [];

  /** Declares a service provider that does nothing else yet. */
  declare(
    name: string,
    service: ServiceRequest,
    scope: ProviderScript["scope"],
  ): void {
    this.scripts.push({
      name,
      service,
      scope,
      requests: [],
      actions: [],
      implementation: "first labeller",
      asynchronous: false,
    });
  }

  /**
   * The provider declared first under the name.
   *
   * @throws ModelError when none is.
   */
  provider(name: string): ProviderScript {
    const script = this.scripts.find((declared) => isNamed(declared, name));
    if (script === undefined) {
      throw new ModelError(
        `the workflow declares no service provider "${name}"`,
      );
    }
    return script;
  }

  /** Attaches the provider to the steps, one or more. */
  attach(name: string, steps: readonly string[]): void {
    const [first, ...rest] = steps;
    if (first === undefined) {
      throw new ModelError(
        `the service provider "${name}" is attached to no step`,
      );
    }
    this.provider(name).steps = [first, ...rest];
  }

  /** Says how the provider fails, once. */
  fails(name: string, failure: ProviderFailure): void {
    const script = this.provider(name);
    if (script.failure !== undefined) {
      throw new ModelError(
        `how the service provider "${name}" fails is already stated`,
      );
    }
    script.failure = failure;
  }
}

function isNamed(script: ProviderScript, name: string): boolean {
  return script.name === name;
}

/** Reads a service type the cases name. */
export function serviceTypeNamed(name: string): ServiceTypeName {
  if (!isServiceType(name)) {
    throw new ModelError(`"${name}" is not a service type of the cases`);
  }
  return name;
}

const knownTypes = new Set<string>(serviceTypes);

function isServiceType(name: string): name is ServiceTypeName {
  return knownTypes.has(name);
}

/** Reads an implementation of `labeller` the cases name. */
export function implementationNamed(name: string): Implementation {
  if (!isImplementation(name)) {
    throw new ModelError(`"${name}" is not an implementation of labeller`);
  }
  return name;
}

const knownImplementations = new Set<string>(implementations);

function isImplementation(name: string): name is Implementation {
  return knownImplementations.has(name);
}
