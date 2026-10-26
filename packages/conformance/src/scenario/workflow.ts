import type { Provided, StepName, Supplied } from "itinera/unstable";
import { Workflow } from "itinera/unstable";
import type { PlainValue } from "itinera/value";
import type { Adapters } from "../adapters.js";
import { given } from "../given.js";
import type { Played } from "../providers.js";
import type { Performer, Roles } from "../roles.js";
import type { Labeller, Meter } from "../services.js";

/** The name of the method of a scenario's workflow class that is its service provider `name`. */
export type ProviderMethod = `provider ${string}`;

/**
 * The workflow class of every scenario, which declares nothing: the builder
 * puts each scenario's workflow together on it, its ID generator returns the
 * journey ID the scenario gives, and every input adapter the scenario
 * declares is its method `adapt`, which plays the script of the adapter
 * attached to the step it is called for. It provides every role the
 * scenario declares, as `perform`, which calls an operation of one. It has
 * a method for each service provider name, added by {@link serving}, since
 * nothing a provider requests says which provider it is.
 */
export class Scenario extends Workflow implements Performer {
  readonly #adapters: Adapters;
  readonly #roles: Roles;
  readonly #providers: Played;

  /** The service provider of each name, once {@link serving} added it. */
  [provider: ProviderMethod]: (
    ...answers: unknown[]
  ) => Provided<unknown> | Promise<Provided<unknown>>;

  constructor(
    readonly id: string,
    adapters: Adapters,
    roles: Roles,
    providers: Played,
  ) {
    super();
    this.#adapters = adapters;
    this.#roles = roles;
    this.#providers = providers;
  }

  /** Calls the operation of the role, as the scenario scripts it. */
  perform(role: string, operation: string): void {
    this.#roles.perform(role, operation);
  }

  /** What the service provider `name` returns, given what its requests were answered with. */
  provideAs(
    name: string,
    answers: readonly unknown[],
  ): Provided<unknown> | Promise<Provided<unknown>> {
    return this.#providers.play(name, answers, (instance, data) =>
      this.provide<Labeller | Meter, PlainValue>(instance, data),
    );
  }

  /** The journey ID the scenario's ID generator returns. */
  journeyId(): string {
    return this.id;
  }

  /**
   * What the adapter attached to `step` returns for the input of `key`,
   * given what its own requests were answered with, in order.
   */
  adapt(step: StepName, key: string, ...answers: unknown[]): Supplied {
    const reply = this.#adapters.reply(step, key, answers);
    return reply.isSome()
      ? this.supply(given(reply.value))
      : this.fromDataBag();
  }
}

/**
 * The scenario's workflow class, given the method `provider <name>` for
 * each provider name it lacks, which plays the script of the provider of
 * that name in whichever scenario calls it. A workflow class must extend
 * `Workflow` itself, so the methods go on `Scenario`, the same for every
 * scenario, and stay there for every later scenario: each plays the
 * providers of the scenario whose workflow calls it.
 */
export function serving(names: readonly string[]): typeof Scenario {
  for (const name of [...new Set(names)].filter(isNotServed)) {
    Object.defineProperty(Scenario.prototype, methodOf(name), {
      value: providing(name),
    });
  }
  return Scenario;
}

function isNotServed(name: string): boolean {
  return !Object.hasOwn(Scenario.prototype, methodOf(name));
}

/** The name of the method that is the service provider `name`. */
export function methodOf(name: string): ProviderMethod {
  return `provider ${name}`;
}

function providing(
  name: string,
): (
  this: Scenario,
  ...answers: unknown[]
) => Provided<unknown> | Promise<Provided<unknown>> {
  return function (this: Scenario, ...answers: unknown[]) {
    return this.provideAs(name, answers);
  };
}
