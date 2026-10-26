import {
  type Contributor,
  type Outcome,
  type StepMock,
  type StepMockClass,
  stepMock,
  type StepMockScript,
  type StepReporter,
} from "itinera/unstable";
import { listedUnder } from "./listed.js";
import type { Acting } from "./scenario/actions.js";

/**
 * A class of step mocks whose `run` requests the attempt's contributor and
 * step reporter, by position, to play what the scenario's step does before
 * it ends.
 */
type ActingClass = StepMockClass &
  (new (...inputs: unknown[]) => StepMock & {
    run(
      contributor?: Contributor,
      reporter?: StepReporter,
    ): Outcome | Promise<Outcome>;
  });

/**
 * Every step the scenario's workflow built, by step name, in the order
 * built, and every step that ran.
 */
export class Witness {
  readonly #built = new Map<string, StepMock[]>();
  readonly #ran: StepMock[] = [];

  /**
   * A class of step mock playing the script, after `acting` when the step
   * does something before it ends, whose every instance is kept under the
   * step's name as it is built, and kept again when it runs.
   */
  classOf(
    step: string,
    script: StepMockScript,
    acting: Acting | undefined,
  ): ActingClass {
    const built = listedUnder(this.#built, step);
    const ran = this.#ran;
    return class extends stepMock(script) {
      readonly #attempt = built.length;

      constructor(...inputs: unknown[]) {
        super(...inputs);
        built.push(this);
      }

      override run(contributor?: Contributor, reporter?: StepReporter) {
        ran.push(this);
        if (
          acting === undefined ||
          contributor === undefined ||
          reporter === undefined
        ) {
          return super.run();
        }
        return acting({
          attempt: this.#attempt,
          inputs: this.inputs,
          contributor,
          reporter,
        }).then(() => super.run());
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
