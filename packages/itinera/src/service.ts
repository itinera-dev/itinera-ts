/**
 * Services: what a service provider is called.
 *
 * @module
 */

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
