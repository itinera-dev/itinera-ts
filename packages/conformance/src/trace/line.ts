import type { Event } from "itinera/event";
import type { PlainValue } from "itinera/value";
import { Writing } from "./writing.js";

/** A column of an event table, other than `event` and `data`. */
export type Column =
  | "step"
  | "attempt"
  | "key"
  | "code"
  | "policy"
  | "hook"
  | "lifecycle"
  | "adapter"
  | "provider"
  | "implementation"
  | "source"
  | "cause"
  | "rescue"
  | "decided by"
  | "message"
  | "error";

/**
 * The data an event table says an event carries: unstated, none, or this
 * value, written as JSON.
 */
export type Data =
  | { readonly kind: "unstated" }
  | { readonly kind: "none" }
  | { readonly kind: "is"; readonly value: PlainValue };

/**
 * One event as an event table describes it: its kind, the cells of its
 * other columns, its data, and what else it carries that no column shows,
 * such as a reason's message and details.
 */
export interface Line {
  readonly event: string;
  readonly cells: ReadonlyMap<Column, string>;
  readonly data: Data;
  readonly carried: readonly PlainValue[];
}

/** The line of an event, with every column it fills. */
export function lineOf(event: Event): Line {
  const line = new Writing();
  written(line, event);
  return {
    event: event.kind,
    cells: line.cells,
    data: line.data,
    carried: line.carried,
  };
}

function written(line: Writing, event: Event): void {
  switch (event.kind) {
    case "journey_started":
      return;
    case "attempt_started":
    case "step_succeeded":
    case "contributions_discarded":
      line.attempt(event);
      return;
    case "input_adapter_supplied":
    case "input_adapter_failed":
      line.attempt(event);
      line.set("key", event.key);
      line.set("adapter", event.adapter);
      return;
    case "optional_input_absent":
      line.set("key", event.key);
      line.named(event.requester);
      return;
    case "service_provided":
      line.attempt(event);
      line.set("key", event.key);
      line.set("provider", event.provider);
      line.set("implementation", event.implementation);
      line.data =
        event.data === undefined
          ? { kind: "none" }
          : { kind: "is", value: event.data };
      return;
    case "service_provider_failed":
      line.attempt(event);
      line.set("key", event.key);
      line.set("provider", event.provider);
      return;
    case "global_metadata_set":
    case "contribution_committed":
    case "data_overwritten":
      line.set("key", event.key);
      line.source(event.source);
      return;
    case "step_failed":
    case "step_skipped":
      line.attempt(event);
      line.reason(event.reason);
      return;
    case "step_abnormal_termination":
      line.attempt(event);
      line.carried.push(event.errorMessage);
      return;
    case "hook_called":
      line.named(event.source);
      line.set(
        "lifecycle",
        "lifecycle" in event ? event.lifecycle.kind : "none",
      );
      return;
    case "journey_aborted":
      line.abort(event.abort);
      return;
    case "step_retrying":
      line.attempt(event);
      line.set("cause", event.cause);
      line.decidedBy(event.decidedBy);
      return;
    case "step_rescuing":
      line.attempt(event);
      line.set("cause", event.cause);
      line.set("rescue", event.rescue);
      line.decidedBy(event.decidedBy);
      return;
    case "step_rescued":
      line.attempt(event);
      line.set("rescue", event.rescue);
      line.decidedBy(event.decidedBy);
      return;
    case "step_given_up":
      line.attempt(event);
      line.set("cause", event.cause);
      line.reason(event.reason);
      line.decidedBy(event.decidedBy);
      return;
    case "journey_succeeded":
      line.decidedBy(event.decidedBy);
      return;
    case "journey_failed":
      line.set("step", event.step);
      line.set("cause", event.cause);
      line.reason(event.reason);
      line.set("error", event.errorMessage);
      line.decidedBy(event.decidedBy);
      return;
    case "step_info":
    case "step_warning":
    case "step_error":
      line.attempt(event);
      line.emitted(event.message, event.data);
      return;
    case "journey_info":
    case "journey_warning":
    case "journey_error":
      line.named(event.source);
      line.emitted(event.message, event.data);
      return;
  }
}
