import type { Event } from "../../src/event.js";
import type { EventKind } from "../../src/event/kind.js";
import type { WorkflowInstance } from "../../src/instance.js";
import type { JourneyId, JourneyResult } from "../../src/journey.js";
import type {
  Dispatcher,
  DispatcherFactory,
  Reporter,
} from "../../src/report.js";
import { DefaultDispatcherFactory } from "../../src/report/default-dispatcher.js";
import type { StepClass, StepOptions } from "../../src/step.js";
import { Ending } from "../../src/testing/ending.js";
import { stepMock } from "../../src/testing/step-mock.js";
import type { PlainValue } from "../../src/value.js";
import { type Built, Workflow, type WorkflowName } from "../../src/workflow.js";
import { runJourney } from "../../src/engine.js";
import { Emitter } from "../../src/engine/emitter.js";
import { Failures } from "../../src/engine/guard.js";
import { Journey } from "../../src/engine/journey.js";

/** The time every event of the engine's tests carries. */
export const noon = "2026-10-19T12:00:00.000Z";

function atNoon(): Date {
  return new Date(noon);
}

/** A workflow class that declares nothing, for the builder. */
export class Orders extends Workflow {}

/** The workflow `orders`, with these steps in order. */
export function orders(
  ...steps: readonly (readonly [StepClass, StepOptions])[]
): Built<Orders> {
  return steps.reduce(withStep, named()).build();
}

function named() {
  return Orders.builder().name("orders");
}

function withStep(
  builder: ReturnType<typeof named>,
  [step, options]: readonly [StepClass, StepOptions],
): ReturnType<typeof named> {
  return builder.step(step, options);
}

/** A step `charge` that succeeds. */
export function charge(): readonly [StepClass, StepOptions] {
  return [stepMock({ attempts: [Ending.success] }), { name: "charge" }];
}

/** A journey of `orders` delivering its events through `dispatcher`, at noon. */
export function journeyThrough(
  dispatcher: Dispatcher,
  failures = new Failures(),
): Journey {
  const emitter = new Emitter(
    "journey-1" as JourneyId,
    "orders" as WorkflowName,
    atNoon,
  );
  return new Journey(emitter, dispatcher, failures);
}

/** A new instance of the workflow `orders` whose one step `charge` succeeds. */
export function charging(
  ...given: Parameters<Built<Orders>["instance"]>
): WorkflowInstance<Orders> {
  return orders(charge()).instance(...given);
}

/** Runs the journey of `instance` with the clock at noon. */
export function run(
  instance: WorkflowInstance,
  factory: DispatcherFactory = new DefaultDispatcherFactory(),
): Promise<JourneyResult> {
  return runJourney(instance, factory, atNoon);
}

/** A reporter that throws an error with the message on each event of a kind. */
export class FailingOn implements Reporter {
  readonly received: Event[] = [];

  constructor(
    private readonly kind: EventKind,
    private readonly message: string,
  ) {}

  report(event: Event): void {
    this.received.push(event);
    if (event.kind === this.kind) {
      throw new Error(this.message);
    }
  }
}

/** A reporter that throws an error with the message on every entry of global metadata. */
export class FailingOnGlobalMetadata implements Reporter {
  constructor(private readonly message: string) {}

  report(): void {
    // Events are not what fails here.
  }

  receiveGlobalMetadata(): void {
    throw new Error(this.message);
  }
}

/** A dispatcher that delivers to its reporters in order, swallowing their failures. */
export class Swallowing implements Dispatcher {
  readonly #reporters: Reporter[] = [];

  add(reporter: Reporter): void {
    this.#reporters.push(reporter);
  }

  async dispatch(event: Event): Promise<void> {
    for (const reporter of this.#reporters) {
      try {
        await reporter.report(event);
      } catch {
        // Swallowed, as a careless dispatcher does.
      }
    }
  }

  async setGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    for (const reporter of this.#reporters) {
      try {
        await reporter.receiveGlobalMetadata?.(key, value);
      } catch {
        // Swallowed, as a careless dispatcher does.
      }
    }
  }
}

/** The factory of the dispatcher `dispatcher`, the same one for every journey. */
export function factoryOf(dispatcher: Dispatcher): DispatcherFactory {
  return { create: () => dispatcher };
}
