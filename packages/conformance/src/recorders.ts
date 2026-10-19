/**
 * The recording reporters of a scenario, each under the name the scenario
 * gives it, failing as the scenario scripts it.
 */
import {
  type Event,
  type PlainValue,
  RecordingReporter,
  type ReporterClass,
} from "itinera/unstable";
import { listedUnder } from "./listed.js";
import type { ReporterFailure } from "./model/report.js";

/**
 * A recording reporter of the scenario: it keeps every event and entry of
 * global metadata it receives, the one it fails on included, then fails as
 * the scenario scripts it, and remembers whether it ever failed.
 */
export class ScenarioReporter extends RecordingReporter {
  readonly #failure: ReporterFailure | undefined;
  #failed = false;

  constructor(failure: ReporterFailure | undefined) {
    super();
    this.#failure = failure;
  }

  /** Whether it failed on any event or entry of global metadata. */
  get failed(): boolean {
    return this.#failed;
  }

  override report(event: Event): void {
    const isFirst = this.events.length === 0;
    super.report(event);
    if (this.#failure !== undefined && failsOn(this.#failure, event, isFirst)) {
      this.#failed = true;
      throw new Error(messageOf(this.#failure, event));
    }
  }

  override receiveGlobalMetadata(key: string, value: PlainValue): void {
    super.receiveGlobalMetadata(key, value);
    if (
      this.#failure?.kind === "on global metadata" &&
      this.#failure.key === key
    ) {
      this.#failed = true;
      throw new Error(
        `the scripted reporter fails on the global metadata ${key}`,
      );
    }
  }
}

function failsOn(
  failure: ReporterFailure,
  event: Event,
  isFirst: boolean,
): boolean {
  switch (failure.kind) {
    case "first event":
      return isFirst;
    case "on event":
      return failure.event === event.kind;
    case "on global metadata":
      return false;
  }
}

function messageOf(failure: ReporterFailure, event: Event): string {
  return failure.kind === "on event" && failure.message !== undefined
    ? failure.message
    : `the scripted reporter fails on ${event.kind}`;
}

/**
 * Every recording reporter of a scenario, by name, in the order each was
 * made: one per journey for a reporter the workflow lists, and one in all for
 * the reporter a dispatcher holds.
 */
export class Recorders {
  readonly #failures: ReadonlyMap<string, ReporterFailure>;
  readonly #made = new Map<string, ScenarioReporter[]>();

  constructor(failures: ReadonlyMap<string, ReporterFailure>) {
    this.#failures = failures;
  }

  /** A new reporter under the name, failing as the scenario scripts it. */
  make(name: string): ScenarioReporter {
    const reporter = new ScenarioReporter(this.#failures.get(name));
    this.#listOf(name).push(reporter);
    return reporter;
  }

  /**
   * The class of the reporter the workflow lists under the name, each of
   * which is kept under the name as it is made.
   */
  classOf(name: string): ReporterClass {
    const failure = this.#failures.get(name);
    const made = this.#listOf(name);
    return class extends ScenarioReporter {
      constructor() {
        super(failure);
        made.push(this);
      }
    };
  }

  /** The reporters made under the name, in the order they were made. */
  made(name: string): readonly ScenarioReporter[] {
    return [...this.#listOf(name)];
  }

  #listOf(name: string): ScenarioReporter[] {
    return listedUnder(this.#made, name);
  }
}

/** Every event the reporter received, in order. */
export function eventsOf(reporter: ScenarioReporter): readonly Event[] {
  return reporter.events;
}
