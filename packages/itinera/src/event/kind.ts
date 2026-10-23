import { closedSet, type ValueOf } from "../closed-set.js";

/**
 * The kind of an event, one per event of the specification's catalogue and
 * per event a step or hook emits. Each value is written as the specification
 * names the event, in snake_case, such as `"step_failed"`, and is the `kind`
 * of every event of that kind.
 *
 * {@includeCode ../../examples/event-kind.ts}
 */
export const EventKind = closedSet({
  /** The journey started. */
  JourneyStarted: "journey_started",
  /** An attempt of a step started. */
  AttemptStarted: "attempt_started",
  /** An input adapter supplied a value for a step's input. */
  InputAdapterSupplied: "input_adapter_supplied",
  /** An input adapter failed for a step's input. */
  InputAdapterFailed: "input_adapter_failed",
  /** An optional request had no value. */
  OptionalInputAbsent: "optional_input_absent",
  /** A service provider made an instance of a step's service. */
  ServiceProvided: "service_provided",
  /** A service provider failed for a step's service. */
  ServiceProviderFailed: "service_provider_failed",
  /** A step, hook or service provider set an entry of global metadata. */
  GlobalMetadataSet: "global_metadata_set",
  /** An attempt reported Success. */
  StepSucceeded: "step_succeeded",
  /** An attempt reported Failure. */
  StepFailed: "step_failed",
  /** An attempt reported Skipped. */
  StepSkipped: "step_skipped",
  /** An error escaped a running step. */
  StepAbnormalTermination: "step_abnormal_termination",
  /** A hook returned without failing. */
  HookCalled: "hook_called",
  /** A contribution reached the data bag. */
  ContributionCommitted: "contribution_committed",
  /** A skipped step's contributions were discarded. */
  ContributionsDiscarded: "contributions_discarded",
  /** A committed key replaced an earlier value. */
  DataOverwritten: "data_overwritten",
  /** The journey was aborted. */
  JourneyAborted: "journey_aborted",
  /** The executor decided to attempt a step again. */
  StepRetrying: "step_retrying",
  /** The executor decided to rescue a step. */
  StepRescuing: "step_rescuing",
  /** A step's rescue step succeeded, and the step will be attempted again. */
  StepRescued: "step_rescued",
  /** The executor decided not to attempt a step again. */
  StepGivenUp: "step_given_up",
  /** The executor decided that the journey succeeds. */
  JourneySucceeded: "journey_succeeded",
  /** The executor decided that the journey fails. */
  JourneyFailed: "journey_failed",
  /** A step reported information. */
  StepInfo: "step_info",
  /** A step reported a warning. */
  StepWarning: "step_warning",
  /** A step reported an error. */
  StepError: "step_error",
  /** A hook or service provider reported information. */
  JourneyInfo: "journey_info",
  /** A hook or service provider reported a warning. */
  JourneyWarning: "journey_warning",
  /** A hook or service provider reported an error. */
  JourneyError: "journey_error",
});

/** One of the values of {@link EventKind}. */
export type EventKind = ValueOf<typeof EventKind>;
