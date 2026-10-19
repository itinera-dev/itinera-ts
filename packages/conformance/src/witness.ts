import {
  type StepMock,
  type StepMockClass,
  stepMock,
  type StepMockScript,
} from "itinera/unstable";
import { listedUnder } from "./listed.js";

/**
 * Every step the scenario's workflow built, by step name, in the order
 * built, and every step that ran.
 */
export class Witness {
  readonly #built = new Map<string, StepMock[]>();
  readonly #ran: StepMock[] = [];

  /**
   * A class of step mock playing the script, whose every instance is kept
   * under the step's name as it is built, and kept again when it runs.
   */
  classOf(step: string, script: StepMockScript): StepMockClass {
    const built = listedUnder(this.#built, step);
    const ran = this.#ran;
    return class extends stepMock(script) {
      constructor() {
        super();
        built.push(this);
      }

      override run() {
        ran.push(this);
        return super.run();
      }
    };
  }

  /** The steps built under the name, in the order they were built. */
  built(step: string): readonly StepMock[] {
    return [...listedUnder(this.#built, step)];
  }

  /** Every step that ran, of any name, in the order each ran. */
  get ran(): readonly StepMock[] {
    return [...this.#ran];
  }
}
