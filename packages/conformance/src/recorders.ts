/**
 * The recording reporters of a scenario, each under the name the scenario
 * gives it, failing as the scenario scripts it.
 */
import {
  EntryRecordingReporter,
  type Event,
  type GlobalMetadataEntry,
  type JourneyId,
  type PlainValue,
} from "itinera/unstable";
import { listedUnder } from "./listed.js";
import { ModelError } from "./model/error.js";
import type { ReporterFailure } from "./model/report.js";

/**
 * A recording reporter of the scenario: it keeps every event and entry of
 * global metadata it receives, the one it fails on included, then fails as
 * the scenario scripts it, and remembers whether it ever failed.
 */
export class ScenarioReporter extends EntryRecordingReporter {
  readonly #failure: ReporterFailure | undefined;
  #failed = false;

  /**
   * A reporter failing as `failure` says, made with the journey ID
   * `madeWith` by the workflow instance, or with none by a dispatcher.
   */
  constructor(
    failure: ReporterFailure | undefined,
    readonly madeWith?: JourneyId,
  ) {
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

  /**
   * A new reporter under the name, failing as the scenario scripts it, made
   * with the journey ID when a workflow instance makes it.
   */
  make(name: string, journeyId?: JourneyId): ScenarioReporter {
    const reporter = new ScenarioReporter(this.#failures.get(name), journeyId);
    this.#listOf(name).push(reporter);
    return reporter;
  }

  /**
   * What makes the reporter the workflow lists under the name, from the
   * journey ID, for each workflow instance.
   */
  makerOf(name: string): (journeyId: JourneyId) => ScenarioReporter {
    return (journeyId) => this.make(name, journeyId);
  }

  /** The reporters made under the name, in the order they were made. */
  made(name: string): readonly ScenarioReporter[] {
    return [...this.#listOf(name)];
  }

  /**
   * The reporters made under the name, in the order they were made, for a
   * sentence that reads what they received.
   *
   * @throws ModelError when none was made, since the case names a reporter
   * that no journey had.
   */
  receivers(name: string): readonly ScenarioReporter[] {
    const made = this.made(name);
    if (made.length === 0) {
      throw new ModelError(`no reporter "${name}" was made`);
    }
    return made;
  }

  #listOf(name: string): ScenarioReporter[] {
    return listedUnder(this.#made, name);
  }
}

/** Every event the reporter received, in order. */
export function eventsOf(reporter: ScenarioReporter): readonly Event[] {
  return reporter.events;
}

/** Every entry of global metadata the reporter received, in order. */
export function entriesOf(
  reporter: ScenarioReporter,
): readonly GlobalMetadataEntry[] {
  return reporter.entries;
}
