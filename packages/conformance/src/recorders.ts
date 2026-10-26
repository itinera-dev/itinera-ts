/**
 * The recording reporters of a scenario, each under the name the scenario
 * gives it, failing as the scenario scripts it.
 */
import {
  type Event,
  FailingReporter,
  type GlobalMetadataEntry,
  type JourneyId,
  type ReporterFailure,
} from "itinera/unstable";
import { listedUnder } from "./listed.js";
import { ModelError } from "./model/error.js";

/**
 * A recording reporter of the scenario: test support's failing reporter,
 * failing as the scenario scripts it, if at all, which remembers the journey
 * ID it was made with.
 */
export class ScenarioReporter extends FailingReporter {
  /**
   * A reporter failing as `failure` says, made with the journey ID
   * `madeWith` by the workflow instance, or with none by a dispatcher.
   */
  constructor(
    failure: ReporterFailure | undefined,
    readonly madeWith?: JourneyId,
  ) {
    super(...(failure === undefined ? [] : [failure]));
  }
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
