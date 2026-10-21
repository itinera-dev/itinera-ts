/**
 * Services: objects of operations a workflow lends its steps, the service
 * providers that make them, what a provider is called, and how a step
 * requests a service.
 *
 * {@includeCode ../examples/service.ts}
 *
 * @module itinera/service
 */

export {
  provider,
  type ProviderDecorator,
  type ProviderOptions,
} from "./service/provider.js";
export type { Provided } from "./service/provider/provided.js";
export { providerReporter, type ProviderReporter } from "./service/reporter.js";
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
