import type { Event } from "../event.js";
import type {
  EmittedByHook,
  EmittedByStep,
  EmittedKind,
} from "../event/emitted.js";
import type { JourneyId } from "../journey.js";
import { None, Some } from "../option.js";
import { WorkflowHook, type PolicyName } from "../policy.js";
import { Attempt, type StepName } from "../step.js";
import type { Dispatcher } from "../report.js";
import type { PlainValue } from "../value.js";
import type { WorkflowName } from "../workflow.js";
import { Emitter } from "../engine/emitter.js";
import { Failures } from "../engine/guard.js";
import { Handles } from "../engine/handles.js";
import type { Holder } from "../engine/handles/holder.js";
import { Journey } from "../engine/journey.js";
import { type Emitted, Level } from "./emitted.js";

/**
 * Who a recorder lends its handles to, outside any journey: a step, or a
 * hook. The name given to each is never shown, since a recorder keeps only
 * what is contributed, emitted and set.
 */
export type Borrower = "step" | "hook";

/**
 * Handles lent outside any journey, through the engine's own, so that each
 * call behaves as in a journey: what they deliver is kept, unless they are
 * failing, when every call is interrupted and nothing is kept, and setting
 * the journey ID's entry of global metadata interrupts that call and every
 * later one.
 */
export class Lone {
  /** The handles lent. */
  readonly handles: Handles;
  readonly #delivered: Delivered;

  constructor(borrower: Borrower, failing: boolean) {
    this.#delivered = new Delivered(failing);
    const journey = new Journey(
      new Emitter("test" as JourneyId, "test" as WorkflowName, now),
      this.#delivered,
      new Failures(),
      new Map(),
    );
    this.handles = new Handles(journey, holderOf(borrower));
  }

  /** Every event emitted, in order. */
  get emitted(): readonly Emitted[] {
    return this.#delivered.events.flatMap(asEmitted);
  }

  /** Each entry of global metadata set, with its latest value. */
  get globalMetadata(): ReadonlyMap<string, PlainValue> {
    return new Map(this.#delivered.globalMetadata);
  }
}

/** The dispatcher of a lone journey: it keeps, or fails on, what it is given. */
class Delivered implements Dispatcher {
  readonly events: Event[] = [];
  readonly globalMetadata = new Map<string, PlainValue>();

  constructor(private readonly failing: boolean) {}

  add(): void {
    // A lone journey is given no reporter: it keeps what it delivers itself.
  }

  dispatch(event: Event): void {
    this.#refuseWhenFailing();
    this.events.push(event);
  }

  setGlobalMetadata(key: string, value: PlainValue): void {
    this.#refuseWhenFailing();
    this.globalMetadata.set(key, value);
  }

  #refuseWhenFailing(): void {
    if (this.failing) {
      throw new Error("the recorder is failing");
    }
  }
}

const levels: Readonly<Record<EmittedKind, Level>> = {
  step_info: Level.Info,
  step_warning: Level.Warning,
  step_error: Level.Error,
  journey_info: Level.Info,
  journey_warning: Level.Warning,
  journey_error: Level.Error,
};

type EmittedEvent = EmittedByStep<EmittedKind> | EmittedByHook<EmittedKind>;

function asEmitted(event: Event): readonly Emitted[] {
  return isEmitted(event) ? [emitted(event)] : [];
}

function isEmitted(event: Event): event is Event & EmittedEvent {
  return Object.hasOwn(levels, event.kind);
}

function emitted(event: EmittedEvent): Emitted {
  return {
    level: levels[event.kind],
    message: event.message,
    data: event.data === undefined ? None : Some(event.data),
  };
}

function holderOf(borrower: Borrower): Holder {
  return borrower === "step"
    ? { kind: "step", step: "step" as StepName, attempt: Attempt.first }
    : {
        kind: "workflow hook",
        policy: "policy" as PolicyName,
        hook: WorkflowHook.OnWorkflowSuccess,
      };
}

function now(): Date {
  return new Date();
}
