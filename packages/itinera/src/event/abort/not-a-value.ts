import type { StepName } from "../../step.js";
import type { EmittedKind } from "../emitted.js";
import type { ByProvider, ByStepHook, ByWorkflowHook } from "../source.js";

/**
 * A step, a hook or a service provider contributed, emitted, set as global
 * metadata, gave in a reason's details, or supplied with an instance,
 * something that is not a value. It names the key of a contribution or an
 * entry of global metadata, or the kind of the event whose data it was, and
 * never both.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export type NotAValue =
  | NotAValueUnderKey
  | NotAValueInEvent
  | NotAValueInServiceProvided
  | NotAValueInDetails;

/**
 * A contribution, or an entry of global metadata, that is not a value.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export interface NotAValueUnderKey {
  /** Why the journey was aborted. */
  readonly reason: "not a value";
  /** The name of the step during which it was given, except for a workflow hook. */
  readonly step?: StepName;
  /** The hook or the service provider that gave it; none when a step did. */
  readonly source?: ByStepHook | ByWorkflowHook | ByProvider;
  /** The key it was given under. */
  readonly key: string;
  /** Never present: it was given under a key, not with an event. */
  readonly eventKind?: never;
}

/**
 * Data given with an event a step, a hook or a service provider emitted
 * about its own work, that is not a value.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export interface NotAValueInEvent {
  /** Why the journey was aborted. */
  readonly reason: "not a value";
  /** The name of the step during which it was given, except for a workflow hook. */
  readonly step?: StepName;
  /** The hook or the service provider that gave it; none when a step did. */
  readonly source?: ByStepHook | ByWorkflowHook | ByProvider;
  /** The kind of the event it was given with. */
  readonly eventKind: EmittedKind;
  /** Never present: it was given with an event, not under a key. */
  readonly key?: never;
}

/**
 * The data a service provider supplied with an instance, which
 * `service_provided` would have carried, that is not a value.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export interface NotAValueInServiceProvided {
  /** Why the journey was aborted. */
  readonly reason: "not a value";
  /** The name of the step the provider made the instance for. */
  readonly step: StepName;
  /** The service provider that supplied it. */
  readonly source: ByProvider;
  /** The kind of the event that would have carried it. */
  readonly eventKind: "service_provided";
  /** Never present: it was supplied with an instance, not under a key. */
  readonly key?: never;
}

/**
 * A reason's details that are not a value.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export interface NotAValueInDetails {
  /** Why the journey was aborted. */
  readonly reason: "not a value";
  /** The name of the step during which it was given, except for a workflow hook. */
  readonly step?: StepName;
  /** The hook that gave it; none when a step did. */
  readonly source?: ByStepHook | ByWorkflowHook;
  /** Never present: details are given with a reason, not under a key. */
  readonly key?: never;
  /** Never present: details are given with a reason, not with an event. */
  readonly eventKind?: never;
}
