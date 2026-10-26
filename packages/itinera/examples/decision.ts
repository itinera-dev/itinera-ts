import type { DecidedBy, Event, GiveUpHook } from "itinera/event";

function decider(decidedBy: DecidedBy): string {
  return decidedBy === "default"
    ? "by default"
    : `by ${decidedBy.policy}, ${decidedBy.hook}`;
}

export function givenUpAfter(hook: GiveUpHook): string {
  return hook === "on step retry"
    ? "before a retry"
    : "after an abnormal termination";
}

export function decision(event: Event): string | undefined {
  if (event.kind === "step_given_up") {
    return `${event.step} given up: ${event.cause}, ${decider(event.decidedBy)}`;
  }
  if (event.kind === "journey_failed" || event.kind === "journey_succeeded") {
    return `${event.kind} ${decider(event.decidedBy)}`;
  }
  return undefined;
}
