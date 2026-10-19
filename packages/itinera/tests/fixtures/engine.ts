import type { Event } from "../../src/event.js";
import type { EventKind } from "../../src/event/kind.js";
import type { WorkflowInstance } from "../../src/instance.js";
import type { JourneyId, JourneyResult } from "../../src/journey.js";
import type { Dispatcher, DispatcherFactory, Reporter } from "../../src/report.js";
import { DefaultDispatcherFactory } from "../../src/report/default-dispatcher.js";
import {
  type Outcome,
  Step,
  type StepBuilder,
  type StepClass,
} from "../../src/step.js";
import { Ending } from "../../src/testing/ending.js";
import { RecordingReporter } from "../../src/testing/recording-reporter.js";
import { type StepMockClass, stepMock } from "../../src/testing/step-mock.js";
import type { PlainValue, Value } from "../../src/value.js";
import {
  type Built,
  type Supplied,
  Workflow,
  type WorkflowName,
} from "../../src/workflow.js";
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

/** What the input adapter of a {@link Shop} does with what it is given. */
export type Adapting = (
  shop: Shop,
  ...given: unknown[]
) => Supplied | Promise<Supplied>;

/**
 * A workflow class whose method `adapt`, given to the builder as an input
 * adapter, keeps what each call was given and does as `adapting` says.
 */
export class Shop extends Workflow {
  readonly calls: unknown[][] = [];

  constructor(private readonly adapting: Adapting) {
    super();
  }

  adapt(...given: unknown[]): Supplied | Promise<Supplied> {
    this.calls.push(given);
    return this.adapting(this, ...given);
  }

  supplying(value: Value): Supplied {
    return this.supply(value);
  }

  reading(): Supplied {
    return this.fromDataBag();
  }
}

/**
 * A class of steps whose every step built keeps what its constructor was
 * given in `built`, for a builder given its requests by position.
 */
export function keeping(built: unknown[][]): KeepingClass {
  return class Keeping extends Step {
    constructor(...needs: unknown[]) {
      super();
      built.push(needs);
    }

    override run(): Outcome {
      return this.succeed();
    }
  };
}

/** A class of steps that {@link keeping} makes. */
type KeepingClass = StepClass & (new (...needs: unknown[]) => Step);

/** The workflow `orders`, with these steps in order. */
export function orders(
  ...steps: readonly StepBuilder<StepClass>[]
): Built<Orders> {
  return steps.reduce(withStep, named()).build();
}

function named() {
  return Orders.builder().name("orders");
}

function withStep(
  builder: ReturnType<typeof named>,
  step: StepBuilder<StepClass>,
): ReturnType<typeof named> {
  return builder.step(step);
}

/** A step `charge` that succeeds. */
export function charge(): StepBuilder<StepMockClass> {
  return stepMock({ attempts: [Ending.success] }).builder("charge");
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
  return new Journey(emitter, dispatcher, failures, new Map());
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

/**
 * What a recording reporter given to an instance of `workflow` with the
 * initial data `data` recorded of its journey, run with the clock at noon.
 */
export async function recorded(
  workflow: Built<Workflow>,
  data: Readonly<Record<string, Value>> = {},
): Promise<RecordingReporter> {
  const recorder = new RecordingReporter();
  await run(workflow.instance(data, { reporters: [recorder] }));
  return recorder;
}

/** What a promise rejected with, given as its value. */
export function caught(thrown: unknown): unknown {
  return thrown;
}

/** A class whose instances serialise themselves as a number of cents. */
export class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
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
