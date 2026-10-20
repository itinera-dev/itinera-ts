import type { Place } from "../../src/declaration/parameter.js";
import type { Tokens } from "../../src/declaration/token.js";
import type { Event } from "../../src/event.js";
import type { EventKind } from "../../src/event/kind.js";
import type { WorkflowInstance } from "../../src/instance.js";
import type { JourneyId, JourneyResult } from "../../src/journey.js";
import type { StepPolicyBuilder } from "../../src/policy/step-policy/builder.js";
import type { WorkflowPolicyBuilder } from "../../src/policy/workflow-policy/builder.js";
import type { Dispatcher, DispatcherFactory, Reporter } from "../../src/report.js";
import { DefaultDispatcherFactory } from "../../src/report/default-dispatcher.js";
import {
  type Outcome,
  Step,
  type StepBuilder,
  type StepClass,
} from "../../src/step.js";
import { Ending } from "../../src/testing/ending.js";
import { FailingReporter } from "../../src/testing/failing-reporter.js";
import { RecordingReporter } from "../../src/testing/recording-reporter.js";
import {
  type StepMock,
  type StepMockClass,
  stepMock,
  type StepMockScript,
} from "../../src/testing/step-mock.js";
import {
  type HookCall,
  type StepPolicyMock,
  type StepPolicyMockClass,
  type StepPolicyMockScript,
  stepPolicyMock,
} from "../../src/testing/step-policy-mock.js";
import {
  type WorkflowPolicyMock,
  type WorkflowPolicyMockClass,
  type WorkflowPolicyMockScript,
  workflowPolicyMock,
} from "../../src/testing/workflow-policy-mock.js";
import type { Provided } from "../../src/service.js";
import { service, serviceType } from "../../src/service/request.js";
import type { AsValue, PlainValue, Value } from "../../src/value.js";
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

/**
 * The workflow `orders`, with the workflow policy `policy` and these steps
 * in order.
 */
export function guarded(
  policy: WorkflowPolicyBuilder<WorkflowPolicyMockClass>,
  ...steps: readonly StepBuilder<StepClass>[]
): Built<Orders> {
  return steps.reduce(withStep, named()).policy(policy).build();
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

/**
 * A class of step policy mocks whose hooks end as `script` says, keeping in
 * `built` every one built, in the order they were built.
 */
export function keptStepPolicy(
  built: StepPolicyMock[],
  script: StepPolicyMockScript = {},
): StepPolicyMockClass {
  return class Kept extends stepPolicyMock(script) {
    constructor() {
      super();
      built.push(this);
    }
  };
}

/**
 * A class of workflow policy mocks whose hooks end as `script` says, keeping
 * in `built` every one built, in the order they were built.
 */
export function keptWorkflowPolicy(
  built: WorkflowPolicyMock[],
  script: WorkflowPolicyMockScript = {},
): WorkflowPolicyMockClass {
  return class Kept extends workflowPolicyMock(script) {
    constructor() {
      super();
      built.push(this);
    }
  };
}

/**
 * The builder of the step policy `alarm`, a class of policy mocks whose
 * hooks end as `script` says, keeping in `built` every one built.
 */
export function alarm(
  built: StepPolicyMock[] = [],
  script: StepPolicyMockScript = {},
): StepPolicyBuilder<StepPolicyMockClass> {
  return keptStepPolicy(built, script).builder("alarm");
}

/**
 * The builder of the workflow policy `audit`, a class of policy mocks whose
 * hooks end as `script` says, keeping in `built` every one built.
 */
export function audit(
  built: WorkflowPolicyMock[] = [],
  script: WorkflowPolicyMockScript = {},
): WorkflowPolicyBuilder<WorkflowPolicyMockClass> {
  return keptWorkflowPolicy(built, script).builder("audit");
}

/** Every call of a hook of the policy mocks `built`, in order. */
export function callsOf(
  built: readonly (StepPolicyMock | WorkflowPolicyMock)[],
): readonly HookCall[] {
  return built.flatMap(callsMadeOn);
}

function callsMadeOn(
  policy: StepPolicyMock | WorkflowPolicyMock,
): readonly HookCall[] {
  return policy.calls;
}

/** The kind of the event. */
export function kindOf(event: Event): string {
  return event.kind;
}

/** A reporter that writes the kind of every event it receives in `log`. */
export class Logging implements Reporter {
  constructor(private readonly log: string[]) {}

  report(event: Event): void {
    this.log.push(event.kind);
  }
}

/** A class of step policy mocks that writes `<name> built` in `log` when built. */
export function logging(log: string[], name: string): StepPolicyMockClass {
  return class extends stepPolicyMock() {
    constructor() {
      super();
      log.push(`${name} built`);
    }
  };
}

/** A step `charge` that fails once then succeeds, writing `charge built` in `log`. */
export function loggedCharge(log: string[]) {
  return class extends stepMock({
    attempts: [Ending.failure("declined"), Ending.success],
  }) {
    constructor() {
      super();
      log.push("charge built");
    }
  }
    .builder("charge")
    .retryBudget(1);
}

/** A reporter that throws an error with the message on each event of a kind. */
export function failingOn(event: EventKind, message: string): FailingReporter {
  return new FailingReporter({ kind: "on event", event, message });
}

/** A service of the engine's tests, labelled with where it came from. */
export interface Gateway {
  /** Where it came from. */
  readonly label: string;
}

/** The type of the service {@link Gateway}. */
export const GATEWAY = serviceType<Gateway>("Gateway");

/**
 * What a service provider of a {@link Till} does, given the provider's
 * method and what its requests were answered with.
 */
export type Providing = (
  till: Till,
  provider: string,
  ...given: unknown[]
) => Provided<Gateway> | Promise<Provided<Gateway>>;

/**
 * A workflow class whose methods `main` and `spare`, given to the builder as
 * service providers, keep what each call was given, after the method's name,
 * and do as `providing` says.
 */
export class Till extends Workflow {
  readonly calls: unknown[][] = [];
  readonly #counts = new Map<string, number>();

  constructor(private readonly providing: Providing = counted) {
    super();
  }

  main(...given: unknown[]): Provided<Gateway> | Promise<Provided<Gateway>> {
    return this.#called("main", given);
  }

  spare(...given: unknown[]): Provided<Gateway> | Promise<Provided<Gateway>> {
    return this.#called("spare", given);
  }

  /** How many times the provider of the method `provider` was called. */
  callsTo(provider: string): number {
    return this.#counts.get(provider) ?? 0;
  }

  lending<T, D = undefined>(instance: T, data?: D & AsValue<D>): Provided<T> {
    return this.provide(instance, data);
  }

  #called(
    provider: string,
    given: unknown[],
  ): Provided<Gateway> | Promise<Provided<Gateway>> {
    this.calls.push([provider, ...given]);
    this.#counts.set(provider, this.callsTo(provider) + 1);
    return this.providing(this, provider, ...given);
  }
}

/**
 * A gateway labelled with the provider's method and how many times it was
 * called, such as `main 2`.
 */
export function counted(till: Till, provider: string): Provided<Gateway> {
  return till.lending({
    label: `${provider} ${String(till.callsTo(provider))}`,
  });
}

/**
 * A class of step mocks that end as `script` says, whose `run` keeps the
 * services it is lent in `lent`, in order, one list per attempt.
 */
export function serviced(
  lent: unknown[][],
  script: StepMockScript = { attempts: [Ending.success] },
): ServicedClass {
  return class Serviced extends stepMock(script) {
    override run(...services: unknown[]): Outcome | Promise<Outcome> {
      lent.push(services);
      return super.run();
    }
  };
}

/** A class of step mocks that {@link serviced} makes. */
type ServicedClass = StepMockClass &
  (new (...inputs: unknown[]) => StepMock & {
    run(...services: unknown[]): Outcome | Promise<Outcome>;
  });

/** The requests of the till's provider `main`, by position. */
export type ProviderRequests = Tokens<unknown[], Place<Till, "main">>;

/**
 * The workflow `orders` of a till playing `providing`, whose step `charge`
 * requests the gateway `payments`, attempted twice when it fails once, served
 * by the till's `main` of attempt scope, making `requests`.
 */
export function chargingTill(
  providing: Providing,
  requests: ProviderRequests = [],
): Built<Till> {
  return Till.builder()
    .name("orders")
    .step(
      serviced([], { attempts: [Ending.failure("declined"), Ending.success] })
        .builder("charge")
        .run(service("payments", GATEWAY))
        .retryBudget(1),
    )
    .provider(
      "main",
      GATEWAY,
      { key: "payments", perAttempt: true },
      ...requests,
    )
    .constructWith(providing)
    .build();
}

/** The events of a journey of the till, with the initial data `data`. */
export async function travelled(
  till: Built<Till>,
  data: Parameters<typeof recorded>[1] = {},
): Promise<readonly Event[]> {
  return (await recorded(till, data)).events;
}
