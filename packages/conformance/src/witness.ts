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
import type { Providers, ServiceRequest } from "./model/provider.js";
import { Played } from "./providers.js";
import { Roles } from "./roles.js";
import { operated } from "./services.js";
import type { Acting } from "./scenario/actions.js";
import type { Kept } from "./scenario/hooks.js";
import { HookWitness } from "./witness/hooks.js";

/**
 * A class of step mocks whose `run` requests the attempt's contributor and
 * step reporter, then the services the step requests, by position, to play
 * what the scenario's step does before it ends.
 */
export type ActingClass = StepMockClass &
  (new (...inputs: unknown[]) => StepMock & {
    run(
      contributor?: Contributor,
      reporter?: StepReporter,
      ...services: unknown[]
    ): Outcome | Promise<Outcome>;
  });

/** A service a step was given for an attempt, with the label its operation returned. */
export interface Lent {
  /** The attempt, counted from 1 among the steps built under the step's name. */
  readonly attempt: number;
  readonly key: string;
  readonly label: string;
}

/**
 * Every step the scenario's workflow built, by step name, in the order
 * built, every step that ran, the handles each kept and the services each
 * was given, every call of a hook, every call of a role's operation, and
 * every call of a service provider.
 */
export class Witness {
  readonly #built = new Map<string, StepMock[]>();
  readonly #ran: StepMock[] = [];
  readonly #kept = new Map<string, Kept>();
  readonly #lent = new Map<string, Lent[]>();
  /** Every call of a hook of the scenario's policies. */
  readonly hooks = new HookWitness();
  /** The roles the workflow provides, counting the calls of their operations. */
  readonly roles: Roles;
  /** The service providers the workflow declares, keeping every call of each. */
  readonly providers: Played;

  constructor(roles: ReadonlyMap<string, Role>, providers: Providers) {
    this.roles = new Roles(roles);
    this.providers = new Played(providers);
  }

  /**
   * A class of step mock playing the script, after calling the operation of
   * each of the `services` it requests, and after `acting` when the step
   * does something before it ends, whose every instance is kept under the
   * step's name as it is built, and kept again when it runs, with its
   * handles when it `keeps` them.
   */
  classOf(
    step: string,
    script: StepMockScript,
    acting: Acting | undefined,
    keeps: boolean,
    services: readonly ServiceRequest[],
  ): ActingClass {
    const built = listedUnder(this.#built, step);
    const lent = listedUnder(this.#lent, step);
    const ran = this.#ran;
    const kept = this.#kept;
    return class extends stepMock(script) {
      readonly #attempt = built.length;

      constructor(...inputs: unknown[]) {
        super(...inputs);
        built.push(this);
      }

      override run(
        contributor?: Contributor,
        reporter?: StepReporter,
        ...given: unknown[]
      ) {
        ran.push(this);
        for (const [at, { key, type }] of services.entries()) {
          const label = operated(type, given[at]);
          lent.push({ attempt: this.#attempt + 1, key, label });
        }
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

  /** The services the step was given, in the order its attempts used them. */
  lent(step: string): readonly Lent[] {
    return [...listedUnder(this.#lent, step)];
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
