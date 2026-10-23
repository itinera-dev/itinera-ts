import type { Event } from "../../src/event.js";
import type { JourneyId } from "../../src/journey.js";
import { Attempt, type StepName } from "../../src/step.js";
import type { WorkflowName } from "../../src/workflow.js";
import type { JourneyAborted } from "../../src/event/fact.js";
import type { Timestamp } from "../../src/event/fields.js";

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
