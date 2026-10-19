import type { Event } from "../event.js";
import type { JourneyId } from "../journey.js";
import { Attempt, type StepName } from "../step.js";
import type { WorkflowName } from "../workflow.js";
import type { JourneyAborted } from "./fact.js";
import type { Timestamp } from "./fields.js";

const fixed = {
  timestamp: "2026-10-19T12:00:00.000Z" as Timestamp,
  journeyId: "journey-1" as JourneyId,
  workflow: "orders" as WorkflowName,
};

/** The first event of a journey, carrying the keys of its initial data. */
export function journeyStarted(): Event {
  return { kind: "journey_started", sequence: 1, ...fixed, initialKeys: [] };
}

/** The first attempt of the step `charge` reported Success. */
export function stepSucceeded(): Event {
  return {
    kind: "step_succeeded",
    sequence: 2,
    ...fixed,
    step: "charge" as StepName,
    attempt: Attempt.first,
  };
}

/** The journey was aborted because a reporter failed. */
export function journeyAborted(): JourneyAborted {
  return {
    kind: "journey_aborted",
    sequence: 3,
    ...fixed,
    abort: { reason: "reporter failed", errorMessage: "disk full" },
  };
}
