import type { Event, Timestamp } from "../event.js";
import type { JourneyId } from "../journey.js";
import type { WorkflowName } from "../workflow.js";
import { frozen } from "./frozen.js";

/** Where the emitter reads the time: the system's clock, or a test's. */
export type Clock = () => Date;

/** The fields of one kind of event that the emitter does not fill in. */
type Body<E> = E extends Event
  ? Omit<E, "sequence" | "timestamp" | "journeyId" | "workflow">
  : never;

/** What the engine says of an event: its kind and what that kind carries. */
export type EventBody = Body<Event>;

/**
 * Makes the events of one journey, numbering them from 1 and stamping each
 * with the time it is made, its journey ID and its workflow's name.
 */
export class Emitter {
  #next = 1;

  constructor(
    private readonly journeyId: JourneyId,
    private readonly workflow: WorkflowName,
    private readonly clock: Clock,
  ) {}

  /** The next event of the journey, frozen, from what it carries. */
  next(body: EventBody): Event {
    const sequence = this.#next;
    this.#next += 1;
    return frozen({
      ...body,
      sequence,
      timestamp: this.clock().toISOString() as Timestamp,
      journeyId: this.journeyId,
      workflow: this.workflow,
    });
  }
}
