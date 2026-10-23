import { describe, expect, it } from "vitest";
import { Ship } from "../../fixtures/step.js";
import {
  type Built,
  withStep,
  Workflow,
  workflow,
} from "../../../src/workflow.js";

@workflow({ name: "orders" })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  constructor(readonly shop: string) {
    super();
  }
}

describe("Workflow.build", () => {
  it("makes the workflow object with the arguments of its constructor", () => {
    expect(Orders.build("corner").shop).toBe("corner");
  });

  it("gives every workflow object of a class the same descriptor", () => {
    expect(Orders.build("corner").instance().descriptor).toBe(
      Orders.build("market").instance().descriptor,
    );
  });

  it("refuses a class not declared with @workflow", () => {
    class Undeclared extends Workflow {}
    expect(() => Undeclared.build()).toThrow(
      "Undeclared is not declared with @workflow, so it has no workflow descriptor",
    );
  });
});

describe("Workflow.listing", () => {
  it("lists what the decorators declared, without making a workflow object", () => {
    @workflow({ name: "counted" })
    @withStep(Ship, { name: "ship" })
    class Counted extends Workflow {
      static made = 0;

      constructor() {
        super();
        Counted.made += 1;
      }
    }
    expect(Counted.listing()).toEqual([
      { step: "ship", position: 1, policies: [], services: [] },
    ]);
    expect(Counted.made).toBe(0);
  });

  it("refuses a class not declared with @workflow", () => {
    class Undeclared extends Workflow {}
    expect(() => Undeclared.listing()).toThrow(
      "Undeclared is not declared with @workflow, so it has no workflow descriptor",
    );
  });
});

describe("Workflow.instance", () => {
  it("holds the workflow object beside its descriptor", () => {
    const orders = Orders.build("corner");
    const instance = orders.instance();
    expect(instance.workflow).toBe(orders);
    expect(instance.descriptor.name).toBe("orders");
  });

  it("refuses a workflow object made with new", () => {
    const made = new Orders("corner") as Built<Orders>;
    expect(() => made.instance()).toThrow(
      "this Orders was made with new: make it with Orders.build()",
    );
  });
});

@workflow({ name: "shop" })
@withStep(Ship, { name: "ship" })
class Shop extends Workflow {
  supplied(value: string): unknown {
    return this.supply(value);
  }

  fromBag(): unknown {
    return this.fromDataBag();
  }

  provided(instance: object, data?: string): unknown {
    return this.provide(instance, data);
  }
}

describe("the helpers of input adapters and service providers", () => {
  it("supply a value to an input", () => {
    expect(Shop.build().supplied("A-1")).toEqual({
      kind: "supplied",
      value: "A-1",
    });
  });

  it("supply nothing, so that an input is read from the data bag", () => {
    expect(Shop.build().fromBag()).toEqual({ kind: "fromDataBag" });
  });

  it.each([
    ["with data", "eu", { instance: Ship, data: "eu" }],
    ["without data", undefined, { instance: Ship }],
  ])("lend an instance of a service %s", (_, data, provided) => {
    expect(Shop.build().provided(Ship, data)).toEqual(provided);
  });
});
