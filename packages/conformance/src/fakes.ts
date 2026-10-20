/**
 * The fakes a scenario gives its instance in place of service providers,
 * through test support, counting every call of each.
 */
import type { WorkflowInstance } from "itinera/instance";
import type { Provided } from "itinera/service";
import { fakeProvider, type Provide } from "itinera/testing";
import type { PlainValue } from "itinera/value";
import type { Workflow } from "itinera/workflow";
import { given } from "./given.js";
import type { Fake } from "./model/testing.js";
import {
  answering,
  LABELLER,
  type Labeller,
  labellerClassOf,
  METER,
  type Meter,
  ScriptedMeter,
} from "./services.js";

/** The fakes of a scenario, with how many times each was called. */
export class Fakes {
  readonly #calls = new Map<string, number>();

  /**
   * `instance`, with each provider of `fakes` replaced by its fake.
   *
   * @throws TestMistake when a fake is named after a provider the workflow
   * does not have, or makes another service than its provider.
   */
  given<W extends Workflow>(
    instance: WorkflowInstance<W>,
    fakes: ReadonlyMap<string, Fake>,
  ): WorkflowInstance<W> {
    for (const [provider, fake] of fakes) {
      this.#replace(instance, provider, fake);
    }
    return instance;
  }

  /** How many times the fake of the provider was called, in every journey. */
  callsTo(provider: string): number {
    return this.#calls.get(provider) ?? 0;
  }

  /**
   * Gives the instance the fake, whose calls are counted for the instance's
   * journey, for its labels, and for the scenario.
   */
  #replace(instance: WorkflowInstance, provider: string, fake: Fake): void {
    let inJourney = 0;
    const called = (): number => {
      this.#calls.set(provider, this.callsTo(provider) + 1);
      inJourney += 1;
      return inJourney;
    };
    if (fake.kind === "makes meters") {
      fakeProvider(instance, provider, METER, (provide) =>
        metered(called, provide),
      );
      return;
    }
    fakeProvider(instance, provider, LABELLER, (provide) =>
      labelled(called, fake, provide),
    );
  }
}

function metered(
  called: () => number,
  provide: Provide<Meter>,
): Provided<Meter> {
  called();
  return provide(new ScriptedMeter(answering(undefined)));
}

function labelled(
  called: () => number,
  fake: Exclude<Fake, { readonly kind: "makes meters" }>,
  provide: Provide<Labeller>,
): Provided<Labeller> {
  const call = called();
  if (fake.kind === "fails") {
    throw new Error(fake.message);
  }
  const Labelling = labellerClassOf(fake.implementation);
  const instance = new Labelling(`fake ${String(call)}`, answering(undefined));
  return fake.data === undefined
    ? provide(instance)
    : provide<PlainValue>(instance, given(fake.data));
}
