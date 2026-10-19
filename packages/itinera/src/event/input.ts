import type { ProviderName } from "../service.js";
import type { PlainValue } from "../value.js";
import type { AdapterName } from "../workflow.js";
import type { FixedFields, StepFields } from "./fields.js";
import type { RequestSource } from "./source.js";

/**
 * An input adapter supplied a value for a step's input.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface InputAdapterSupplied extends StepFields<"input_adapter_supplied"> {
  /** The input's key. */
  readonly key: string;
  /** The adapter's name. */
  readonly adapter: AdapterName;
}

/**
 * An input adapter failed for a step's input, or supplied what is not a
 * value.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface InputAdapterFailed extends StepFields<"input_adapter_failed"> {
  /** The input's key. */
  readonly key: string;
  /** The adapter's name. */
  readonly adapter: AdapterName;
}

/**
 * An optional request had no value.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface OptionalInputAbsent extends FixedFields<"optional_input_absent"> {
  /** The key that was requested. */
  readonly key: string;
  /** Who requested it. */
  readonly requester: RequestSource;
}

/**
 * A service provider made an instance of a step's service.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface ServiceProvided extends StepFields<"service_provided"> {
  /** The service's key. */
  readonly key: string;
  /** The provider's name. */
  readonly provider: ProviderName;
  /** The implementation the instance is, usually its class's name. */
  readonly implementation: string;
  /** The data the provider supplied with the instance, captured as a value. */
  readonly data?: PlainValue;
}

/**
 * A service provider failed for a step's service, or returned nothing.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface ServiceProviderFailed extends StepFields<"service_provider_failed"> {
  /** The service's key. */
  readonly key: string;
  /** The provider's name. */
  readonly provider: ProviderName;
}
