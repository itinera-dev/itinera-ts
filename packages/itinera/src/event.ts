/**
 * Events: the record of what happens in a journey, and what only events
 * carry.
 *
 * @module
 */
import type {
  JourneyFailed,
  JourneySucceeded,
  StepGivenUp,
  StepRescued,
  StepRescuing,
  StepRetrying,
} from "./event/decision.js";
import type {
  JourneyError,
  JourneyInfo,
  JourneyWarning,
  StepError,
  StepInfo,
  StepWarning,
} from "./event/emitted.js";
import type {
  ContributionCommitted,
  ContributionsDiscarded,
  DataOverwritten,
  GlobalMetadataSet,
} from "./event/data.js";
import type {
  AttemptStarted,
  HookCalled,
  JourneyAborted,
  JourneyStarted,
  StepAbnormalTermination,
  StepFailed,
  StepSkipped,
  StepSucceeded,
} from "./event/fact.js";
import type {
  InputAdapterFailed,
  InputAdapterSupplied,
  OptionalInputAbsent,
  ServiceProvided,
  ServiceProviderFailed,
} from "./event/input.js";

export type * from "./event/abort.js";
export type * from "./event/data.js";
export type * from "./event/decision.js";
export { RescueCause } from "./event/decision.js";
export type * from "./event/emitted.js";
export type * from "./event/fact.js";
export type * from "./event/fields.js";
export type * from "./event/input.js";
export { EventKind } from "./event/kind.js";
export type * from "./event/requester.js";
export type * from "./event/source.js";

/**
 * One event of a journey's event stream: a discriminated union on `kind`,
 * one member per kind of event. Only itinera makes events.
 *
 * Every event carries its kind, a sequence number, increasing from 1 within
 * the journey, a timestamp, the journey ID and the workflow name; what else
 * it carries depends on its kind. Engine events carry keys, never the values
 * of the data bag. Events are frozen, data included, so a reporter cannot
 * change what the next one reads. They carry no format of their own: each
 * reporter writes them as it chooses.
 *
 * {@includeCode ../examples/event.ts}
 */
export type Event =
  | JourneyStarted
  | AttemptStarted
  | InputAdapterSupplied
  | InputAdapterFailed
  | OptionalInputAbsent
  | ServiceProvided
  | ServiceProviderFailed
  | GlobalMetadataSet
  | StepSucceeded
  | StepFailed
  | StepSkipped
  | StepAbnormalTermination
  | HookCalled
  | ContributionCommitted
  | ContributionsDiscarded
  | DataOverwritten
  | JourneyAborted
  | StepRetrying
  | StepRescuing
  | StepRescued
  | StepGivenUp
  | JourneySucceeded
  | JourneyFailed
  | StepInfo
  | StepWarning
  | StepError
  | JourneyInfo
  | JourneyWarning
  | JourneyError;
