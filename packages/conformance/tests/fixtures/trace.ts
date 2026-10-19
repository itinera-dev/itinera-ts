import {
  Attempt,
  type Event,
  type JourneyId,
  type StepName,
  type Timestamp,
  type WorkflowName,
} from "itinera/unstable";
import { type PlainValue } from "itinera/value";

const journey = {
  sequence: 1,
  timestamp: "2026-10-19T12:00:00.000Z" as Timestamp,
  journeyId: "journey-1" as JourneyId,
  workflow: "orders" as WorkflowName,
};

/** `journey_started`, with no initial keys. */
export const started = {
  ...journey,
  kind: "journey_started",
  initialKeys: [],
} satisfies Event;

/** The first attempt of the step, as an event names it. */
function first(step: string) {
  return { step: step as StepName, attempt: Attempt.first };
}

/** `attempt_started` of the step's first attempt. */
export function attemptStarted(step: string): Event {
  return { ...journey, kind: "attempt_started", ...first(step) };
}

/** `step_succeeded` of the step's first attempt. */
export function stepSucceeded(step: string): Event {
  return { ...journey, kind: "step_succeeded", ...first(step) };
}

/** `step_given_up` of the step's first attempt, after an abnormal termination. */
export function stepGivenUp(step: string): Event {
  return {
    ...journey,
    kind: "step_given_up",
    ...first(step),
    cause: "abnormal termination",
    decidedBy: "default",
  };
}

/** `step_rescuing` of the step's first attempt, handing it to its rescue step. */
export function stepRescuing(step: string): Event {
  return {
    ...journey,
    kind: "step_rescuing",
    ...first(step),
    cause: "abnormal termination",
    rescue: `${step}_rescue` as StepName,
    decidedBy: "default",
  };
}

/** `journey_aborted` because a reporter failed while the step ran. */
export function abortedAt(step: string): Event {
  return {
    ...journey,
    kind: "journey_aborted",
    abort: {
      reason: "reporter failed",
      step: step as StepName,
      errorMessage: "disk full",
    },
  };
}

/** `step_info` of the step's first attempt, with the message and data. */
export function stepInfo(
  step: string,
  message: string,
  data: PlainValue,
): Event {
  return {
    ...journey,
    kind: "step_info",
    ...first(step),
    message,
    data,
  };
}

/** `step_skipped` of the step's first attempt, with a reason saying why. */
export function stepSkipped(step: string): Event {
  return {
    ...journey,
    kind: "step_skipped",
    ...first(step),
    reason: { code: "nothing to ship", message: "the cart is empty" },
  };
}
