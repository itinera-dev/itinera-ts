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
import type { Role } from "./model/policy.js";
import { Roles } from "./roles.js";
import type { Acting } from "./scenario/actions.js";
import type { Kept } from "./scenario/hooks.js";
import { HookWitness } from "./witness/hooks.js";

/**
 * A class of step mocks whose `run` requests the attempt's contributor and
 * step reporter, by position, to play what the scenario's step does before
 * it ends.
 */
export type ActingClass = StepMockClass &
  (new (...inputs: unknown[]) => StepMock & {
    run(
      contributor?: Contributor,
      reporter?: StepReporter,
    ): Outcome | Promise<Outcome>;
  });

/**
 * Every step the scenario's workflow built, by step name, in the order
 * built, every step that ran and the handles each kept, every call of a
 * hook, and every call of a role's operation.
 */
export class Witness {
  readonly #built = new Map<string, StepMock[]>();
  readonly #ran: StepMock[] = [];
  readonly #kept = new Map<string, Kept>();
  /** Every call of a hook of the scenario's policies. */
  readonly hooks = new HookWitness();
  /** The roles the workflow provides, counting the calls of their operations. */
  readonly roles: Roles;

  constructor(roles: ReadonlyMap<string, Role>) {
    this.roles = new Roles(roles);
  }

  /**
   * A class of step mock playing the script, after `acting` when the step
   * does something before it ends, whose every instance is kept under the
   * step's name as it is built, and kept again when it runs, with its
   * handles when it `keeps` them.
   */
  classOf(
    step: string,
    script: StepMockScript,
    acting: Acting | undefined,
    keeps: boolean,
  ): ActingClass {
    const built = listedUnder(this.#built, step);
    const ran = this.#ran;
    const kept = this.#kept;
    return class extends stepMock(script) {
      readonly #attempt = built.length;

      constructor(...inputs: unknown[]) {
        super(...inputs);
        built.push(this);
      }

      override run(contributor?: Contributor, reporter?: StepReporter) {
        ran.push(this);
        if (keeps && contributor !== undefined && reporter !== undefined) {
          kept.set(step, { contributor, reporter });
        }
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

  /** The handles the step kept after its last attempt, if it kept any. */
  kept(step: string): Kept | undefined {
    return this.#kept.get(step);
  }

  /** Every step that ran, of any name, in the order each ran. */
  get ran(): readonly StepMock[] {
    return [...this.#ran];
  }
}
