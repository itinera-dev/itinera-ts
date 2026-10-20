import type { Event } from "itinera/event";
import type { JourneyResult } from "itinera/journey";
import type { ListedStep } from "itinera/workflow";
import { Alone } from "./alone.js";
import { type Fixture, fixtureListing, ranFixture } from "./fixture.js";
import {
  admitted,
  type Admission,
  type Journey,
  ran,
  ranScripted,
  streamOf,
} from "./journeys.js";
import { Model } from "./model.js";
import { ModelError } from "./model/error.js";
import { Recorders } from "./recorders.js";
import { listingOf } from "./scenario.js";
import { Tested } from "./tested.js";
import { Unmet } from "./unmet.js";
import { Witness } from "./witness.js";

/** What the runner keeps for one scenario while its sentences run, made new for each. */
export class World {
  /** What the scenario's Given sentences declare. */
  readonly model = new Model();
  /** Every recording reporter of the scenario, by name. */
  readonly recorders = new Recorders(this.model.reporterFailures);
  /** What the scenario's workflow built and called: steps, hooks, roles and providers. */
  readonly witness = new Witness(
    this.model.policies.roles,
    this.model.providers,
  );
  /** What the scenario's test support kept. */
  readonly tested = new Tested();
  #admission: Admission | undefined;
  #journeys: readonly Journey[] = [];
  #listing: readonly ListedStep[] | undefined;
  #alone: Alone | undefined;
  #fixture: Fixture | undefined;

  /**
   * Names the hand-written workflow the scenario runs, which declares the
   * scenario's workflow, so that no other may be declared.
   */
  nameFixture(fixture: Fixture): void {
    this.model.declare(fixture, []);
    this.#fixture = fixture;
  }

  /** Builds the workflow the scenario declares, once. */
  admit(): Admission {
    this.#admission ??= admitted(this.model, this.witness);
    return this.#admission;
  }

  /**
   * Runs `times` journeys on one executor: of the hand-written workflow the
   * scenario names, or of the workflow it declares, once admitted, keeping
   * the test mistake that stops them.
   */
  async run(times: number): Promise<void> {
    if (this.#fixture !== undefined) {
      this.#journeys = await ranFixture(
        this.#fixture,
        this.model,
        this.recorders,
        times,
      );
      return;
    }
    const admission = this.admit();
    if (admission.kind === "admitted") {
      await this.tested.caught(async () => {
        this.#journeys = await ran(
          admission.workflow,
          this.model,
          this.recorders,
          this.tested,
          times,
        );
      });
    }
  }

  /**
   * Runs one journey of the workflow with the scenario's script, once
   * admitted, keeping the test mistake that stops it.
   */
  async runScripted(): Promise<void> {
    const admission = this.admit();
    if (admission.kind === "admitted") {
      await this.tested.caught(async () => {
        this.#journeys = await ranScripted(
          admission.workflow,
          this.model,
          this.recorders,
          this.tested,
        );
      });
    }
  }

  /**
   * Calls a step, a hook or an input adapter alone, outside any journey, as
   * `calling` does with the recorders of test support.
   */
  async callAlone(
    calling: (alone: Alone) => Promise<void> | void,
  ): Promise<void> {
    this.#alone = new Alone(this.model.testing);
    await calling(this.#alone);
  }

  /** What was called alone was lent and gave, once a When sentence called it. */
  get alone(): Alone {
    if (this.#alone === undefined) {
      throw new ModelError("nothing was called alone");
    }
    return this.#alone;
  }

  /**
   * Lists the workflow the scenario declares or names, without running
   * anything.
   */
  list(): void {
    this.#listing =
      this.#fixture === undefined
        ? listingOf(this.model, this.witness)
        : fixtureListing(this.#fixture);
  }

  /** The workflow's listing, once a When sentence listed it. */
  get listing(): readonly ListedStep[] {
    if (this.#listing === undefined) {
      throw new ModelError("the workflow was not listed");
    }
    return this.#listing;
  }

  /** What building the workflow gave, once a When sentence built it. */
  get admission(): Admission {
    if (this.#admission === undefined) {
      throw new ModelError("the workflow was neither admitted nor run");
    }
    return this.#admission;
  }

  /** Every journey the scenario ran, in order. */
  get journeys(): readonly Journey[] {
    return this.#journeys;
  }

  /**
   * The scenario's journey, the last when it ran several.
   *
   * @throws Unmet when the builder refused the workflow, so no journey ran.
   * @throws ModelError when the scenario only admitted the workflow.
   */
  get journey(): Journey {
    const last = this.#journeys.at(-1);
    if (last !== undefined) {
      return last;
    }
    const admission = this.admission;
    if (admission.kind === "refused") {
      throw new Unmet(
        `expected a journey; the workflow was refused: ${admission.violations.message}`,
      );
    }
    throw new ModelError("the workflow was only admitted, so no journey ran");
  }

  /**
   * The result of the scenario's journey.
   *
   * @throws Unmet when `run` refused the journey instead.
   */
  get result(): JourneyResult {
    const { ended } = this.journey;
    if (ended.kind === "refused") {
      throw new Unmet(
        `expected a journey result; run was refused: ${ended.refusal.message}`,
      );
    }
    return ended.result;
  }

  /**
   * The event stream of a journey, the last that ran by default; with no
   * journey, everything the held reporter received, or nothing under the
   * default dispatcher.
   */
  stream(journey = this.#journeys.at(-1)): readonly Event[] {
    return streamOf(this.model, this.recorders, this.#journeys, journey);
  }
}
