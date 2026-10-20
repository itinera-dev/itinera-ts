import type { StepName, Supplied } from "itinera/unstable";
import { Workflow } from "itinera/unstable";
import type { Adapters } from "../adapters.js";
import { given } from "../given.js";
import type { Performer, Roles } from "../roles.js";

/**
 * The workflow class of every scenario, which declares nothing: the builder
 * puts each scenario's workflow together on it, its ID generator returns the
 * journey ID the scenario gives, and every input adapter the scenario
 * declares is its method `adapt`, which plays the script of the adapter
 * attached to the step it is called for. It provides every role the
 * scenario declares, as `perform`, which calls an operation of one.
 */
export class Scenario extends Workflow implements Performer {
  readonly #adapters: Adapters;
  readonly #roles: Roles;

  constructor(
    readonly id: string,
    adapters: Adapters,
    roles: Roles,
  ) {
    super();
    this.#adapters = adapters;
    this.#roles = roles;
  }

  /** Calls the operation of the role, as the scenario scripts it. */
  perform(role: string, operation: string): void {
    this.#roles.perform(role, operation);
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
