import { marking } from "../declaration.js";
import { named } from "../name.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { Step } from "../step.js";
import type { RescueStep } from "../step/rescue.js";

declare const served: unique symbol;

/**
 * A type of service, `T`, as a token that exists while the program runs,
 * since an interface does not. A step requests a service by its key and its
 * service type, and the provider serving it declares the same service type.
 * Two service types are the same only when they are the same object.
 *
 * {@includeCode ../../examples/service.ts}
 *
 * @typeParam T The type of the service.
 */
export interface ServiceType<T> {
  /** The name of the type, for people, such as `"PaymentGateway"`. */
  readonly name: string;
  /** Marks the token as one for services of type `T`. */
  readonly [served]: T;
}

/**
 * A new type of service, named `name`, for services of type `T`. Make one per
 * type of service, and share it between the steps that request it and the
 * providers that supply it.
 *
 * {@includeCode ../../examples/service.ts}
 *
 * @throws Error if the name is empty.
 */
export function serviceType<T>(name: string): ServiceType<T> {
  return Object.freeze({
    name: named<string>(name, "a service type"),
  }) as ServiceType<T>;
}

/**
 * Requests a service of type `type`, by its key, in the `run` of a step or a
 * rescue step: the workflow's provider of that key lends one for the
 * attempt. A service is always required.
 *
 * {@includeCode ../../examples/service.ts}
 */
export function service<T>(
  key: string,
  type: ServiceType<T>,
): RequestDecorator<T, Place<Step | RescueStep, "run">> {
  return marking(() => ({ kind: "service", key, type }));
}
