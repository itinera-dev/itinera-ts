import type { PolicyName } from "../policy.js";

/**
 * Why `run` refused an instance, before any journey and with no event.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export type Refused =
  | InstanceRan
  | JourneyRunning
  | InitialValues
  | WorkflowPolicyFailed
  | DispatcherFactoryFailed
  | DispatcherFailed
  | GlobalMetadataNotSet;

/**
 * The instance was handed to `run` before: an instance runs at most one
 * journey, so each journey needs an instance of its own.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface InstanceRan {
  /** Tells this refusal from the others. */
  readonly kind: "instance ran";
}

/**
 * The executor was running a journey: an executor runs one journey at a
 * time, and parallelism comes from several executors.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface JourneyRunning {
  /** Tells this refusal from the others. */
  readonly kind: "journey running";
}

/**
 * The instance's initial data holds what is not a value, or its initial
 * global metadata holds what is not a value or sets `journey_id`, which only
 * the executor sets.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface InitialValues {
  /** Tells this refusal from the others. */
  readonly kind: "initial values";
  /** The keys of the initial data whose values are not values, in order. */
  readonly initialData: readonly string[];
  /**
   * The keys of the initial global metadata whose values are not values, or
   * that are reserved, in order.
   */
  readonly initialGlobalMetadata: readonly string[];
}

/** What a refusal caused by failing custom code carries. */
interface CausedByError {
  /** What the custom code threw, as it was thrown. */
  readonly error: unknown;
  /**
   * The message of what it threw: its `message` for an `Error`, and its text
   * otherwise.
   */
  readonly errorMessage: string;
}

/**
 * One of the workflow's policies failed while it was built for the journey.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface WorkflowPolicyFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "workflow policy failed";
  /** The policy's name. */
  readonly policy: PolicyName;
}

/**
 * The executor's dispatcher factory failed while it made the journey's
 * dispatcher.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface DispatcherFactoryFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "dispatcher factory failed";
}

/**
 * The journey's dispatcher failed while the instance's reporters were added
 * to it.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface DispatcherFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "dispatcher failed";
}

/**
 * A reporter, or the dispatcher, failed while the journey ID or the initial
 * global metadata was passed to the reporters.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export interface GlobalMetadataNotSet extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "global metadata not set";
}

/**
 * What `run` rejects with when it refuses an instance, before any journey
 * starts and before any event: `refused` says why. When failing custom code
 * caused it, the error is also its standard `cause`.
 *
 * {@includeCode ../../examples/refusal.ts}
 */
export class Refusal extends Error {
  /** Names the kind of error, as every error's `name` does. */
  override readonly name = "Refusal";

  /** Why `run` refused the instance. */
  readonly refused: Refused;

  /** The refusal of an instance, for the reason `refused` gives. */
  constructor(refused: Refused) {
    super(
      messageOf(refused),
      "error" in refused ? { cause: refused.error } : undefined,
    );
    this.refused = refused;
  }
}

function messageOf(refused: Refused): string {
  switch (refused.kind) {
    case "instance ran":
      return "run refused an instance that already ran: make an instance for each journey";
    case "journey running":
      return "run refused an instance while the executor runs a journey: wait for it, or run on another executor";
    case "initial values":
      return `run refused an instance: ${initialValues(refused)}`;
    case "workflow policy failed":
      return `run refused an instance: workflow policy ${refused.policy} failed while it was built: ${refused.errorMessage}`;
    case "dispatcher factory failed":
      return `run refused an instance: the dispatcher factory failed: ${refused.errorMessage}`;
    case "dispatcher failed":
      return `run refused an instance: the dispatcher failed while the reporters were added: ${refused.errorMessage}`;
    case "global metadata not set":
      return `run refused an instance: the global metadata could not be set: ${refused.errorMessage}`;
  }
}

function initialValues(refused: InitialValues): string {
  return [
    listed("the initial data is not a value under", refused.initialData),
    listed(
      "the initial global metadata is not a value, or is reserved, under",
      refused.initialGlobalMetadata,
    ),
  ]
    .filter(isSaid)
    .join("; ");
}

function listed(what: string, keys: readonly string[]): string {
  return keys.length === 0 ? "" : `${what} ${keys.join(", ")}`;
}

function isSaid(text: string): boolean {
  return text !== "";
}
