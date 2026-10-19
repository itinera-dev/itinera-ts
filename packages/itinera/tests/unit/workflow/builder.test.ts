import { describe, expect, it } from "vitest";
import type { Event } from "../../../src/event.js";
import { journeyId } from "../../../src/journey.js";
import type { Reporter } from "../../../src/report.js";
import { type Outcome, Step } from "../../../src/step.js";
import { Charge, Ship } from "../../fixtures/step.js";
import {
  type Built,
  idGenerator,
  withStep,
  Workflow,
  workflow,
} from "../../../src/workflow.js";
import { Violations } from "../../../src/workflow/violation.js";
import { Close, type Messages, Notify } from "../../fixtures/policy.js";
import { type Provided, serviceType } from "../../../src/service.js";
import type { StepName } from "../../../src/step.js";
import type { Attempt } from "../../../src/step/attempt.js";
import { attempt, stepName } from "../../../src/step/request.js";
import { key } from "../../../src/workflow/adapter.js";
import type { Supplied } from "../../../src/workflow/adapter/supplied.js";
import { adaptersOf, providersOf } from "../../../src/workflow/descriptor.js";

class Audit implements Reporter {
  readonly events: Event[] = [];

  report(event: Event): void {
    this.events.push(event);
  }
}

class Shop extends Workflow {
  static made = 0;

  constructor(readonly shop: string) {
    super();
    Shop.made += 1;
  }

  orderId(): string {
    return `${this.shop}-1`;
  }

  withPrefix(prefix: string): string {
    return `${prefix}-1`;
  }

  fromAnything(given: unknown): string {
    return String(given);
  }
}

@workflow({ name: "orders", reporters: [Audit] })
@withStep(Charge, { name: "charge" })
class Orders extends Workflow {
  @idGenerator()
  orderId(): string {
    return "order-1";
  }
}

function shop() {
  return Shop.builder().name("shop").step(Ship.builder("ship"));
}

function stepNames(workflow: Built<Workflow>): string[] {
  return workflow
    .instance()
    .descriptor.steps()
    .map((step) => step.name);
}

describe("the builder", () => {
  it("puts a workflow together without decorators", () => {
    const built = shop().idGenerator("orderId").constructWith("corner").build();
    const instance = built.instance();
    expect(built.shop).toBe("corner");
    expect(instance.descriptor.name).toBe("shop");
    expect(instance.journeyId).toBe("corner-1");
    expect(stepNames(built)).toEqual(["ship"]);
  });

  it("starts from what the decorators declared, and adds to it", () => {
    const built = Orders.builder()
      .step(Ship.builder("ship"))
      .reporter(Audit)
      .build();
    const { descriptor, journeyId } = built.instance();
    expect(stepNames(built)).toEqual(["charge", "ship"]);
    expect(descriptor.reporters()).toEqual([new Audit(), new Audit()]);
    expect(journeyId).toBe("order-1");
  });

  it("leaves what the decorators declared as it was", () => {
    Orders.builder().step(Ship.builder("ship")).build();
    expect(stepNames(Orders.build())).toEqual(["charge"]);
  });

  it("names the workflow in place of the name @workflow gave", () => {
    const built = Orders.builder().name("shipping").build();
    expect(built.instance().descriptor.name).toBe("shipping");
  });

  it("describes a step as its builder had put it together when it was given", () => {
    const ship = Ship.builder("ship");
    const built = Shop.builder()
      .name("shop")
      .step(ship)
      .constructWith("corner")
      .build();
    ship.retryBudget(2);
    expect(built.instance().descriptor.steps()).toMatchObject([
      { retryBudget: 0 },
    ]);
  });

  it("makes a new descriptor every time it builds", () => {
    const builder = shop().constructWith("corner");
    expect(builder.build().instance().descriptor).not.toBe(
      builder.build().instance().descriptor,
    );
  });

  it("takes a step class not declared with @step, or extending another step", () => {
    class Pack extends Step {
      override run(): Outcome {
        return this.succeed();
      }
    }
    class Express extends Ship {}
    const built = shop()
      .step(Pack.builder("pack"))
      .step(Express.builder("express"))
      .constructWith("corner")
      .build();
    expect(stepNames(built)).toEqual(["ship", "pack", "express"]);
  });

  it("refuses an empty name", () => {
    expect(() => Shop.builder().name("")).toThrow(
      "workflow class Shop has an empty name",
    );
  });

  it("refuses to build a workflow with no name", () => {
    expect(() => Shop.builder().constructWith("corner").build()).toThrow(
      "workflow Shop has no name: give it one with @workflow or with its builder's name()",
    );
  });

  it("refuses violations before it calls the constructor", () => {
    const made = Shop.made;
    expect(() =>
      shop().step(Ship.builder("ship")).constructWith("corner").build(),
    ).toThrow(Violations);
    expect(Shop.made).toBe(made);
  });

  it("lists what it has put together so far, without making a workflow object", () => {
    const made = Shop.made;
    expect(
      shop()
        .step(Charge.builder("charge"))
        .listing()
        .map((listed) => listed.step),
    ).toEqual(["ship", "charge"]);
    expect(Shop.made).toBe(made);
  });

  it("refuses to list a workflow with violations", () => {
    expect(() => shop().step(Ship.builder("ship")).listing()).toThrow(
      Violations,
    );
  });

  it("refuses a second ID generator", () => {
    expect(() => Orders.builder().idGenerator("orderId")).toThrow(
      "Orders has more than one ID generator",
    );
  });

  it("refuses as ID generator a field holding a function", () => {
    class Counter extends Workflow {
      readonly orderId = (): string => "counter-1";
    }
    expect(() => Counter.builder().idGenerator("orderId")).toThrow(
      "Counter.orderId is not a method of the class",
    );
  });

  it("refuses a class extending another workflow class", () => {
    class Special extends Orders {}
    expect(() => Special.builder()).toThrow(
      "Special must extend Workflow itself",
    );
  });

  it("refuses a request an ID generator may not make, which a parameter of type unknown lets through", () => {
    expect(() => shop().idGenerator("fromAnything", journeyId())).toThrow(
      "Shop.fromAnything: an ID generator cannot request @journeyId",
    );
  });

  it("refuses an ID generator with a parameter that a cast let through", () => {
    expect(() => shop().idGenerator("withPrefix" as "orderId")).toThrow(
      "Shop.withPrefix: parameter 1 carries no request",
    );
  });
});

const PAYMENTS = serviceType<string>("Payments");

class Tills extends Workflow implements Messages {
  readonly told: string[] = [];
  readonly price = "not a method";

  tell(message: string): void {
    this.told.push(message);
  }

  pricing(step: StepName, inputKey: string): Supplied {
    return this.supply(`${step}.${inputKey}`);
  }

  payments(attempted: Attempt): Provided<string> {
    return this.provide(`till ${String(attempted)}`);
  }

  counter(): Provided<string> {
    return this.provide("counter");
  }
}

/** A workflow's builder whose lists take anything, as their methods' bivariance lets through. */
function loosely(builder = tills()): {
  inputAdapter(key: string, ...given: unknown[]): unknown;
  provider(key: string, ...given: unknown[]): unknown;
} {
  return builder;
}

function tills() {
  return Tills.builder().name("tills").step(Ship.builder("ship"));
}

describe("the builder's other lists", () => {
  it("attaches workflow policies, declared classes or policies' builders, in order", () => {
    const built = tills()
      .policy(Notify)
      .policy(Close.builder("close").onWorkflowFailure("failed"))
      .build();
    expect(
      built
        .instance()
        .descriptor.policies()
        .map((policy) => policy.name),
    ).toEqual(["notify", "close"]);
  });

  it("refuses at once a workflow policy class not declared with @workflowPolicy", () => {
    expect(() => tills().policy(Close)).toThrow(
      "Close is not declared with @workflowPolicy",
    );
  });

  it("adds input adapters, their requests given by position", () => {
    const built = tills()
      .inputAdapter("pricing", { steps: ["ship"] }, stepName(), key())
      .build();
    expect(adaptersOf(built.instance().descriptor)).toEqual([
      {
        name: "pricing",
        steps: ["ship"],
        key: "pricing",
        // eslint-disable-next-line @typescript-eslint/unbound-method -- compared, never called
        method: Tills.prototype.pricing,
        requests: [{ kind: "stepName" }, { kind: "key" }],
      },
    ]);
  });

  it("adds service providers, their requests given by position", () => {
    const built = tills()
      .provider("payments", PAYMENTS, { perAttempt: true }, attempt())
      .provider("counter", PAYMENTS, { key: "cash", name: "cash desk" })
      .build();
    expect(providersOf(built.instance().descriptor)).toMatchObject([
      {
        name: "payments",
        serviceKey: "payments",
        type: PAYMENTS,
        scope: "attempt",
        steps: undefined,
        key: "payments",
        requests: [{ kind: "attempt" }],
      },
      { name: "cash desk", serviceKey: "cash", scope: "journey", requests: [] },
    ]);
  });

  it("refuses at once a request an input adapter may not make", () => {
    expect(() => {
      loosely().inputAdapter(
        "pricing",
        { steps: ["ship"] },
        stepName(),
        attempt(),
      );
    }).toThrow("Tills.pricing: an input adapter cannot request @attempt");
  });

  it("refuses at once a parameter of a provider left without a request", () => {
    expect(() => {
      loosely().provider("payments", PAYMENTS, {});
    }).toThrow("Tills.payments: parameter 1 carries no request");
  });

  it("refuses at once a field named as an input adapter", () => {
    expect(() => {
      loosely().inputAdapter("price", { steps: ["ship"] });
    }).toThrow("Tills.price is not a method of the class");
  });

  it("refuses at once an empty name of an input adapter", () => {
    expect(() =>
      tills().inputAdapter(
        "pricing",
        { steps: ["ship"], name: "" },
        stepName(),
        key(),
      ),
    ).toThrow("the input adapter Tills.pricing has an empty name");
  });
});
