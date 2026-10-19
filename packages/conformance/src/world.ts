import type { Event, JourneyResult } from "itinera/unstable";
import {
  admitted,
  type Admission,
  type Journey,
  ran,
  streamOf,
} from "./journeys.js";
import { Model } from "./model.js";
import { ModelError } from "./model/error.js";
import { Recorders } from "./recorders.js";
import { Unmet } from "./unmet.js";
import { Witness } from "./witness.js";

/** What the runner keeps for one scenario while its sentences run, made new for each. */
export class World {
  /** What the scenario's Given sentences declare. */
  readonly model = new Model();
  /** Every recording reporter of the scenario, by name. */
  readonly recorders = new Recorders(this.model.reporterFailures);
  /** Every step the scenario's workflow built. */
  readonly witness = new Witness();
  #admission: Admission | undefined;
  #journeys: readonly Journey[] = [];

  /** Builds the workflow the scenario declares, once. */
  admit(): Admission {
    this.#admission ??= admitted(this.model, this.witness);
    return this.#admission;
  }

  /** Runs the journeys of the workflow, `times` of them on one executor, once admitted. */
  async run(times: number): Promise<void> {
    const admission = this.admit();
    if (admission.kind === "admitted") {
      this.#journeys = await ran(
        admission.workflow,
        this.model,
        this.recorders,
        times,
      );
    }
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
