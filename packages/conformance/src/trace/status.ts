import type { Event } from "itinera/event";
import { ModelError } from "../model/error.js";

/** The statuses a step ends a journey in, as the cases name them. */
export const statuses = [
  "succeeded",
  "failed",
  "skipped",
  "not executed",
  "rescuing",
  "aborted",
] as const;

/** A step's status at the end of a journey. */
export type Status = (typeof statuses)[number];

const known = new Set<string>(statuses);

/** Reads a step status from its name. */
export function stepStatus(name: string): Status {
  if (!isStatus(name)) {
    throw new ModelError(`"${name}" is not a step status`);
  }
  return name;
}

function isStatus(name: string): name is Status {
  return known.has(name);
}

/**
 * The step's status, read from the journey's events: the first event that
 * settles it, which stays final even when the journey is aborted afterwards;
 * otherwise `aborted` when `journey_aborted` names it; otherwise `rescuing`
 * once its rescue step was handed a failed attempt, or `aborted` when the
 * journey was aborted after that; otherwise `not executed` when no attempt
 * started; nothing while it was still being attempted.
 */
export function statusOf(
  events: readonly Event[],
  step: string,
): Status | undefined {
  return (
    events.map(settledBy(step)).find(isSettled) ??
    (events.some(abortsAt(step)) ? "aborted" : undefined) ??
    rescuing(events, step) ??
    (attemptsOf(events, step) === 0 ? "not executed" : undefined)
  );
}

function isSettled(status: Status | undefined): status is Status {
  return status !== undefined;
}

function settledBy(step: string): (event: Event) => Status | undefined {
  return (event) => settled(event, step);
}

const settling = new Map<string, Status>([
  ["step_succeeded", "succeeded"],
  ["step_skipped", "skipped"],
  ["step_given_up", "failed"],
]);

/** The status the event settles the step in, if it is one of its own that settles it. */
function settled(event: Event, step: string): Status | undefined {
  const status = settling.get(event.kind);
  return "step" in event && event.step === step ? status : undefined;
}

/** Whether the event is a `journey_aborted` naming the step. */
export function abortsAt(step: string): (event: Event) => boolean {
  return (event) =>
    event.kind === "journey_aborted" && event.abort.step === step;
}

function rescuing(events: readonly Event[], step: string): Status | undefined {
  if (!events.some(handsOver(step))) {
    return undefined;
  }
  return events.some(isJourneyAborted) ? "aborted" : "rescuing";
}

function handsOver(step: string): (event: Event) => boolean {
  return (event) => isHandedOver(event, step);
}

function isHandedOver(event: Event, step: string): boolean {
  return event.kind === "step_rescuing" && event.step === step;
}

/** Whether the event is `journey_aborted`. */
export function isJourneyAborted(event: Event): boolean {
  return event.kind === "journey_aborted";
}

/** How many attempts of the step started. */
export function attemptsOf(events: readonly Event[], step: string): number {
  return events.filter(startsAnAttemptOf(step)).length;
}

function startsAnAttemptOf(step: string): (event: Event) => boolean {
  return (event) => startsAnAttempt(event, step);
}

function startsAnAttempt(event: Event, step: string): boolean {
  return event.kind === "attempt_started" && event.step === step;
}
