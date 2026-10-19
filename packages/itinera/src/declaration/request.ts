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
export type Request =
  Input | Data | Service | Handle | Context | FailureRequest;

/** A step's input: a value from the workflow, by key. */
export interface Input {
  /** Tells this request from the others. */
  readonly kind: "input";
  /** The key, local to the step. */
  readonly key: string;
  /** The type of the value. */
  readonly type: Checked;
}

/**
 * Data a hook requests by key: from the step it acts on, or from the
 * workflow, read from the data bag.
 */
export interface Data {
  /** Where the data is read from. */
  readonly kind: "fromStep" | "fromWorkflow";
  /** The key. */
  readonly key: string;
  /** The type of the value. */
  readonly type: Checked;
}

/** What a hook requests of the failed attempt: its reason, or its error. */
export interface FailureRequest {
  /** Which of the two is requested. */
  readonly kind: "failureReason" | "error";
  /** Whether a missing reason or error gives `None`. */
  readonly optional: boolean;
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

/**
 * A handle itinera makes for the call it is given to, or the workflow object
 * as a role.
 */
export interface Handle {
  /** Which handle is requested. */
  readonly kind: "contributor" | "hookReporter" | "role" | "stepReporter";
}

/**
 * Something itinera knows about the call: the step, its attempt, the
 * journey, or a cause.
 */
export interface Context {
  /** What is requested. */
  readonly kind:
    "attempt" | "failureCause" | "journeyId" | "retryCause" | "stepName";
}
