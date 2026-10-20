import type { Contributor } from "itinera/journey";
import type { StepReporter } from "itinera/step";
import {
  rescueStepMock,
  type RescueStepMockScript,
  stepMock,
  type StepMockScript,
} from "itinera/testing";
import { listedUnder } from "./listed.js";
import type { Role } from "./model/policy.js";
import type { Providers, ServiceRequest } from "./model/provider.js";
import { Played } from "./providers.js";
import { Roles } from "./roles.js";
import { operated } from "./services.js";
import type { Acting } from "./scenario/actions.js";
import type { Kept } from "./scenario/hooks.js";
import { HookWitness } from "./witness/hooks.js";
import type {
  ActingClass,
  ActingRescueClass,
  Mock,
  RunWith,
} from "./witness/mocks.js";

export type { ActingClass, ActingRescueClass, Mock } from "./witness/mocks.js";

/** What a mock does when it runs, before it ends as its script says. */
interface Playing {
  readonly step: string;
  readonly acting: Acting | undefined;
  readonly keeps: boolean;
  readonly services: readonly ServiceRequest[];
}

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
  readonly #built = new Map<string, Mock[]>();
  readonly #ran: Mock[] = [];
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
    const playing = { step, acting, keeps, services };
    const ran = this.#ran.push.bind(this.#ran);
    const play = this.#play.bind(this);
    return class extends stepMock(script) {
      readonly #attempt = built.length;

      constructor(...inputs: unknown[]) {
        super(...inputs);
        built.push(this);
      }

      override run(...handed: RunWith) {
        ran(this);
        const [contributor, reporter, ...given] = handed;
        const handles = { contributor, reporter, given };
        const acted = play(playing, this.#attempt, this.inputs, handles);
        return acted === undefined
          ? super.run()
          : acted.then(() => super.run());
      }
    };
  }

  /**
   * A class of rescue step mock playing the script, as {@link classOf}
   * makes for a step, whose every instance is kept under the rescue step's
   * name.
   */
  rescueClassOf(
    step: string,
    script: RescueStepMockScript,
    acting: Acting | undefined,
    keeps: boolean,
    services: readonly ServiceRequest[],
  ): ActingRescueClass {
    const built = listedUnder(this.#built, step);
    const playing = { step, acting, keeps, services };
    const ran = this.#ran.push.bind(this.#ran);
    const play = this.#play.bind(this);
    return class extends rescueStepMock(script) {
      readonly #attempt = built.length;

      constructor(...needs: unknown[]) {
        super(...needs);
        built.push(this);
      }

      override run(...handed: RunWith) {
        ran(this);
        const [contributor, reporter, ...given] = handed;
        const handles = { contributor, reporter, given };
        const acted = play(playing, this.#attempt, this.inputs, handles);
        return acted === undefined
          ? super.run()
          : acted.then(() => super.run());
      }
    };
  }

  /**
   * Plays what a mock does when it runs: calls the operation of each service
   * it is lent, keeping the label each returned, keeps its handles when it
   * keeps them, then acts, when it does something before it ends, giving
   * the promise of its acting, or nothing when it does not act.
   */
  #play(
    { step, acting, keeps, services }: Playing,
    attempt: number,
    inputs: readonly unknown[],
    { contributor, reporter, given }: Handed,
  ): Promise<void> | undefined {
    const lent = listedUnder(this.#lent, step);
    for (const [at, { key, type }] of services.entries()) {
      const label = operated(type, given[at]);
      lent.push({ attempt: attempt + 1, key, label });
    }
    if (keeps && contributor !== undefined && reporter !== undefined) {
      this.#kept.set(step, { contributor, reporter });
    }
    if (
      acting === undefined ||
      contributor === undefined ||
      reporter === undefined
    ) {
      return undefined;
    }
    return acting({ attempt, inputs, contributor, reporter });
  }

  /** The steps built under the name, in the order they were built. */
  built(step: string): readonly Mock[] {
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
  get ran(): readonly Mock[] {
    return [...this.#ran];
  }
}

/** The handles and services a mock's `run` was given. */
interface Handed {
  readonly contributor: Contributor | undefined;
  readonly reporter: StepReporter | undefined;
  readonly given: readonly unknown[];
}
