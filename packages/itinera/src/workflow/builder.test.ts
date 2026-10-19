import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import type { Reporter } from "../report.js";
import { type Outcome, Step } from "../step.js";
import { Charge, Ship } from "../step/fixtures.js";
import {
  type Built,
  idGenerator,
  withStep,
  Workflow,
  workflow,
} from "../workflow.js";
import { Violations } from "./violation.js";

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
  return Shop.builder().name("shop").step(Ship, { name: "ship" });
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
      .step(Ship, { name: "ship" })
      .reporter(Audit)
      .build();
    const { descriptor, journeyId } = built.instance();
    expect(stepNames(built)).toEqual(["charge", "ship"]);
    expect(descriptor.reporters()).toEqual([new Audit(), new Audit()]);
    expect(journeyId).toBe("order-1");
  });

  it("leaves what the decorators declared as it was", () => {
    Orders.builder().step(Ship, { name: "ship" }).build();
    expect(stepNames(Orders.build())).toEqual(["charge"]);
  });

  it("names the workflow in place of the name @workflow gave", () => {
    const built = Orders.builder().name("shipping").build();
    expect(built.instance().descriptor.name).toBe("shipping");
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
      .step(Pack, { name: "pack" })
      .step(Express, { name: "express" })
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
      shop().step(Ship, { name: "ship" }).constructWith("corner").build(),
    ).toThrow(Violations);
    expect(Shop.made).toBe(made);
  });

  it("refuses a step whose constructor has a parameter with no request", () => {
    class Weigh extends Step {
      constructor(readonly grams: number) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(() => shop().step(Weigh, { name: "weigh" })).toThrow(
      "the constructor of Weigh has a parameter with no request",
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

  it("refuses an ID generator with a parameter that a cast let through", () => {
    expect(() => shop().idGenerator("withPrefix" as "orderId")).toThrow(
      "Shop.withPrefix has a parameter with no request",
    );
  });
});
