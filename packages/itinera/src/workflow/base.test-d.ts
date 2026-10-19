import { describe, expectTypeOf, it } from "vitest";
import { Ship } from "../step/fixtures.js";
import { type Built, withStep, Workflow, workflow } from "../workflow.js";

@workflow({ name: "orders" })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  constructor(readonly shop: string) {
    super();
  }
}

describe("Workflow.build", () => {
  it("makes a built workflow object of the class", () => {
    expectTypeOf(Orders.build("corner")).toEqualTypeOf<Built<Orders>>();
  });

  it("takes the arguments of the class's constructor", () => {
    // @ts-expect-error the constructor takes a string
    Orders.build(3);
  });

  it("cannot build Workflow itself", () => {
    // @ts-expect-error Workflow is abstract
    Workflow.build();
  });
});

describe("Workflow.instance", () => {
  it("is called only on a workflow object made by build()", () => {
    // @ts-expect-error an object made with new is not built
    new Orders("corner").instance();
  });

  it("takes initial data made of values only", () => {
    // @ts-expect-error a date is not a value
    Orders.build("corner").instance({ at: new Date() });
  });

  it("takes initial global metadata made of values only", () => {
    Orders.build("corner").instance(
      {},
      // @ts-expect-error a date is not a value
      { reportersGlobalMetadata: { at: new Date() } },
    );
  });
});
