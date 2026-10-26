import type { Event } from "itinera/event";

export function summary(event: Event): string {
  if (event.kind === "step_failed") {
    return `${event.step} failed: ${event.reason.code}`;
  }
  if (event.kind === "journey_aborted") {
    return `aborted: ${event.abort.reason}`;
  }
  return `${event.kind} at ${event.timestamp}`;
}
