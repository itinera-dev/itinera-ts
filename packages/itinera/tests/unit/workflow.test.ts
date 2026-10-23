import { describe, expect, it } from "vitest";
import { Ship } from "../fixtures/step.js";
import {
  type Built,
  withStep,
  Workflow,
  workflow,
} from "../../src/workflow.js";

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
      "Undeclared is not declared with @workflow, so it has no workflow descriptor to build from",
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
