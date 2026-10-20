/**
 * What the scenario's test support kept while its When sentences ran: test
 * support's recording reporter, the fakes and the calls they saw, the
 * mistake that stopped the test, and the scripted run's record.
 */
import type { WorkflowInstance } from "itinera/instance";
import {
  RecordingReporter,
  type ScriptedRun,
  TestMistake,
} from "itinera/testing";
import type { Built } from "itinera/workflow";
import { Fakes } from "./fakes.js";
import { ModelError } from "./model/error.js";
import type { Model } from "./model.js";
import type { Recorders } from "./recorders.js";
import { type GivenReporter, instanceOf } from "./scenario.js";
import type { Scenario } from "./scenario/workflow.js";
import { Unmet } from "./unmet.js";

/** What the scenario's test support kept, made new for each scenario. */
export class Tested {
  /** The fakes given in place of service providers, counting their calls. */
  readonly fakes = new Fakes();
  #recordingReporter: RecordingReporter | undefined;
  #mistake: TestMistake | undefined;
  #scriptedRun: ScriptedRun | undefined;

  /**
   * A new instance of the workflow, as the scenario makes it, with `first`
   * as its first reporter when given, test support's recording reporter as
   * its last when the scenario adds it, and the fakes the scenario gives.
   *
   * @throws TestMistake when a fake is named after a provider the workflow
   * does not have, or makes another service than its provider.
   */
  instanceOf(
    workflow: Built<Scenario>,
    model: Model,
    recorders: Recorders,
    first?: GivenReporter,
  ): WorkflowInstance<Scenario> {
    this.#recordingReporter = model.testing.recordingReporter
      ? new RecordingReporter()
      : undefined;
    const instance = instanceOf(workflow, model, recorders, {
      first,
      last: this.#recordingReporter,
    });
    return this.fakes.given(instance, model.testing.fakes);
  }

  /**
   * Awaits `running`, keeping the test mistake it throws or rejects with, as
   * test support reports a mistake in a test.
   */
  async caught(running: () => Promise<void>): Promise<void> {
    try {
      await running();
    } catch (error) {
      if (!(error instanceof TestMistake)) {
        throw error;
      }
      this.#mistake = error;
    }
  }

  /** Keeps the record of the scripted run, and gives its journey's result. */
  keep(run: ScriptedRun): ScriptedRun["result"] {
    this.#scriptedRun = run;
    return run.result;
  }

  /** Test support's recording reporter of the scenario's instance. */
  get recordingReporter(): RecordingReporter {
    if (this.#recordingReporter === undefined) {
      throw new ModelError(
        "the instance has no recording reporter of test support",
      );
    }
    return this.#recordingReporter;
  }

  /**
   * The mistake that stopped the test.
   *
   * @throws Unmet when no mistake stopped it.
   */
  get mistake(): TestMistake {
    if (this.#mistake === undefined) {
      throw new Unmet(
        "expected the test to stop before the journey; no test mistake was reported",
      );
    }
    return this.#mistake;
  }

  /**
   * The record of the scripted run.
   *
   * @throws Unmet when a mistake stopped the test, so no run was recorded.
   */
  get scriptedRun(): ScriptedRun {
    if (this.#scriptedRun === undefined) {
      throw new Unmet(
        `expected a scripted run's record; ${this.#mistake === undefined ? "none was made" : `the test stopped: ${this.#mistake.message}`}`,
      );
    }
    return this.#scriptedRun;
  }
}
