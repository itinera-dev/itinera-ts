/**
 * Services: objects of operations a workflow lends its steps, what a service
 * provider is called, and how a step requests a service.
 *
 * @module
 */

export { service, serviceType, type ServiceType } from "./service/request.js";

declare const providerName: unique symbol;

/**
 * The name of a service provider, which makes the instances of a service that
 * steps use: a string that is never empty, checked when the workflow is
 * declared.
 *
 * {@includeCode ../examples/names.ts}
 */
export type ProviderName = string & {
  /** Marks the string as a provider name made by itinera. */
  readonly [providerName]: true;
};
