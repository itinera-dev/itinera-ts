import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ServiceType } from "../service.js";

/**
 * The type a request for a value checks: a schema, and whether the request
 * is optional, so that it gives `None` rather than aborting when there is
 * no value.
 */
export interface Checked {
  /** Checks a value, when there is one. */
  readonly schema: StandardSchemaV1;
  /** Whether a missing value gives `None`. */
  readonly optional: boolean;
}

/**
 * What one parameter of a constructor or a method of a declared class
 * requests, as its decorator recorded it.
 */
export type Request = Input | Service | Handle;

/** A step's input: a value from the workflow, by key. */
export interface Input {
  /** Tells this request from the others. */
  readonly kind: "input";
  /** The key, local to the step. */
  readonly key: string;
  /** The type of the value. */
  readonly type: Checked;
}

/** A service, by key, lent to a step for its attempt. */
export interface Service {
  /** Tells this request from the others. */
  readonly kind: "service";
  /** The key, unique among the step's services. */
  readonly key: string;
  /** The type of the service. */
  readonly type: ServiceType<unknown>;
}

/** A handle itinera makes for the call it is given to. */
export interface Handle {
  /** Which handle is requested. */
  readonly kind: "contributor" | "stepReporter";
}
