import type {
  Event,
  JourneyAborted,
  JourneyFailed,
  JourneySucceeded,
  StepGivenUp,
} from "../../event.js";
import type { StepFields } from "../../event/fields.js";
import type { EventKind } from "../../event/kind.js";

/**
 * The line an event writes in a journey's path, or none for an event that is
 * not part of the journey's flow.
 */
export function line(event: Event): string | undefined {
  switch (event.kind) {
    case "step_succeeded":
      return `${attempted(event)} succeeded`;
    case "step_failed":
      return `${attempted(event)} failed: ${event.reason.code}`;
    case "step_skipped":
      return event.reason === undefined
        ? `${attempted(event)} skipped`
        : `${attempted(event)} skipped: ${event.reason.code}`;
    case "step_abnormal_termination":
      return `${attempted(event)} terminated abnormally: ${event.errorMessage}`;
    case "step_retrying":
      return `${event.step} retrying`;
    case "step_given_up":
      return `${event.step} given up: ${givenUpFor(event)}`;
    case "step_rescuing":
      return `${event.step} rescuing with ${event.rescue}`;
    case "step_rescued":
      return `${event.step} rescued by ${event.rescue}`;
    case "journey_succeeded":
      return succeeded(event);
    case "journey_failed":
      return `journey failed at ${event.step}: ${failedFor(event)}`;
    case "journey_aborted":
      return aborted(event);
    case "journey_started":
    case "attempt_started":
    case "input_adapter_supplied":
    case "input_adapter_failed":
    case "optional_input_absent":
    case "service_provided":
    case "service_provider_failed":
    case "global_metadata_set":
    case "hook_called":
    case "contribution_committed":
    case "contributions_discarded":
    case "data_overwritten":
    case "step_info":
    case "step_warning":
    case "step_error":
    case "journey_info":
    case "journey_warning":
    case "journey_error":
      return undefined;
  }
}

/** The step and the attempt an outcome is about, as a line begins. */
function attempted(event: StepFields<EventKind>): string {
  return `${event.step} attempt ${String(event.attempt.number)}`;
}

function givenUpFor(event: StepGivenUp): string {
  return event.decidedBy === "default"
    ? event.cause
    : `FailWorkflow from ${event.decidedBy.policy}`;
}

function succeeded(event: JourneySucceeded): string {
  return event.decidedBy === "default"
    ? "journey succeeded"
    : `journey succeeded, decided by ${event.decidedBy.policy}`;
}

function failedFor(event: JourneyFailed): string {
  return event.errorMessage ?? event.reason.code;
}

function aborted(event: JourneyAborted): string {
  const { abort } = event;
  return abort.step === undefined
    ? `journey aborted: ${abort.reason}`
    : `journey aborted at ${abort.step}: ${abort.reason}`;
}
