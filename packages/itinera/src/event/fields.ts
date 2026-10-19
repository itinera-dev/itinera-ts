import type { JourneyId } from "../journey.js";
import type { Attempt, StepName } from "../step.js";
import type { WorkflowName } from "../workflow.js";
import type { EventKind } from "./kind.js";

declare const timestamp: unique symbol;

/**
 * When an event was emitted: an instant in UTC, written in ISO 8601 to the
 * millisecond, as `Date.prototype.toISOString` writes it, such as
 * `"2026-10-19T12:24:42.000Z"`. `new Date(timestamp)` reads it back.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type Timestamp = string & {
  /** Marks the string as a timestamp made by itinera. */
  readonly [timestamp]: true;
};

/**
 * The fields every event carries, whatever its kind.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface FixedFields<K extends EventKind> {
  /** The event's kind, which tells what else it carries. */
  readonly kind: K;
  /** The event's position in its journey's event stream, from 1. */
  readonly sequence: number;
  /** When the event was emitted. */
  readonly timestamp: Timestamp;
  /** The journey's ID. */
  readonly journeyId: JourneyId;
  /** The workflow's name. */
  readonly workflow: WorkflowName;
}

/**
 * The fields every event about a step carries: the fixed fields, and the
 * step and attempt it is about.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface StepFields<K extends EventKind> extends FixedFields<K> {
  /** The step's name. */
  readonly step: StepName;
  /** The attempt. */
  readonly attempt: Attempt;
}
