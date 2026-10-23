/**
 * The dispatcher factory the runner gives the executor, and the dispatchers
 * it makes, which hold a recording reporter and behave as the scenario says.
 */
import {
  DefaultDispatcher,
  type Dispatcher,
  type DispatcherFactory,
  type Event,
  type PlainValue,
  type Reporter,
} from "itinera/unstable";
import type { Holding } from "./model.js";

/**
 * What the factory does when asked for a dispatcher: make one that holds the
 * reporter and does with the reporters added to it as it holds them, or fail.
 */
type Behaviour =
  | { readonly kind: "makes"; readonly holding: Holding }
  | { readonly kind: "fails" };

/**
 * Makes the dispatchers the executor is given: each holds the same reporter,
 * before any reporter the executor adds, and behaves as the scenario says.
 */
export class RecordingDispatcherFactory implements DispatcherFactory {
  readonly #held: Reporter;
  readonly #behaviour: Behaviour;

  constructor(held: Reporter, behaviour: Behaviour) {
    this.#held = held;
    this.#behaviour = behaviour;
  }

  create(): Dispatcher {
    if (this.#behaviour.kind === "fails") {
      throw new Error("the scripted dispatcher factory fails");
    }
    const delivery = new DefaultDispatcher();
    delivery.add(this.#held);
    return new RecordingDispatcher(delivery, this.#behaviour.holding);
  }
}

/**
 * Delivers as the default dispatcher does, to the reporter it holds first and
 * then to the reporters it accepts, unless its script says otherwise.
 */
class RecordingDispatcher implements Dispatcher {
  readonly #delivery: DefaultDispatcher;
  readonly #holding: Holding;

  constructor(delivery: DefaultDispatcher, holding: Holding) {
    this.#delivery = delivery;
    this.#holding = holding;
  }

  add(reporter: Reporter): void {
    switch (this.#holding.kind) {
      case "fails when adding":
        throw new Error(
          "the scripted dispatcher fails when a reporter is added",
        );
      case "ignores added reporters":
        return;
      case "adds reporters":
      case "fails dispatching":
        this.#delivery.add(reporter);
    }
  }

  dispatch(event: Event): Promise<void> {
    if (
      this.#holding.kind === "fails dispatching" &&
      this.#holding.event === event.kind
    ) {
      throw new Error(
        `the scripted dispatcher fails when dispatching ${event.kind}`,
      );
    }
    return this.#delivery.dispatch(event);
  }

  setGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    return this.#delivery.setGlobalMetadata(key, value);
  }
}
