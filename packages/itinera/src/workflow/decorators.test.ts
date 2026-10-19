import { describe, expect, it } from "vitest";
import { type Outcome, Step } from "../step.js";
import { Charge, Ship } from "../step/fixtures.js";
import { Workflow } from "../workflow.js";
import { idGenerator, withStep, workflow } from "./decorators.js";
import { declarationOf } from "./registry.js";
import { Violations } from "./violation.js";

describe("workflow", () => {
  it("lists the steps in the order their decorators are written", () => {
    @workflow({ name: "orders" })
    @withStep(Charge, { name: "charge" })
    @withStep(Ship, { name: "ship" })
    class Orders extends Workflow {}

    const steps = declarationOf(Orders).descriptor?.steps() ?? [];
    expect(steps.map((described) => described.name)).toEqual([
      "charge",
      "ship",
    ]);
  });

  it("refuses an empty name", () => {
    expect(() => {
      @workflow({ name: "" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("workflow class Orders has an empty name");
  });

  it("refuses a class that extends another workflow", () => {
    class Shop extends Workflow {}
    expect(() => {
      @workflow({ name: "orders" })
      class Orders extends Shop {}
      return Orders;
    }).toThrow("Orders must extend Workflow itself");
  });

  it("refuses a class declared twice", () => {
    expect(() => {
      @workflow({ name: "orders" })
      @workflow({ name: "orders" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Orders is declared with @workflow twice");
  });

  it("refuses two steps with one name, naming it once", () => {
    function declaring(): typeof Workflow {
      @workflow({ name: "orders" })
      @withStep(Ship, { name: "ship" })
      @withStep(Charge, { name: "ship" })
      @withStep(Ship, { name: "ship" })
      class Orders extends Workflow {}
      return Orders;
    }
    expect(declaring).toThrow(Violations);
    expect(declaring).toThrow(/^duplicate step name: ship$/);
  });
});

describe("withStep", () => {
  it("refuses a step class not declared with @step", () => {
    class Pack extends Step {
      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(() => {
      @workflow({ name: "orders" })
      @withStep(Pack, { name: "pack" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow("Pack is not declared with @step");
  });

  it("refuses to be written above @workflow", () => {
    expect(() => {
      @withStep(Ship, { name: "ship" })
      @workflow({ name: "orders" })
      class Orders extends Workflow {}
      return Orders;
    }).toThrow(
      "@withStep(Ship) is written above @workflow on Orders: write @workflow on the top line",
    );
  });
});

describe("idGenerator", () => {
  it("records the method it marks", () => {
    class Orders extends Workflow {
      @idGenerator()
      orderId(): string {
        return "order-1";
      }
    }
    expect(declarationOf(Orders).idGenerator).toBe(
      Object.getOwnPropertyDescriptor(Orders.prototype, "orderId")?.value,
    );
  });

  it("refuses what is not a method", () => {
    expect(() => {
      class Orders extends Workflow {
        @idGenerator()
        get orderId(): () => string {
          return orderOne;
        }
      }
      return Orders;
    }).toThrow("@idGenerator marks a method, not orderId");
  });

  it("refuses a second ID generator", () => {
    expect(() => {
      class Orders extends Workflow {
        @idGenerator()
        orderId(): string {
          return "order-1";
        }

        @idGenerator()
        otherId(): string {
          return "order-2";
        }
      }
      return Orders;
    }).toThrow("Orders has more than one ID generator");
  });

  it("refuses a parameter with no request", () => {
    expect(() => {
      class Orders extends Workflow {
        @idGenerator()
        orderId(prefix = "order"): string {
          return prefix;
        }
      }
      return Orders;
    }).toThrow("Orders.orderId has a parameter with no request");
  });

  it("needs the compiler to record the types of parameters", () => {
    class Orders extends Workflow {
      orderId(): string {
        return "order-1";
      }
    }
    expect(() => {
      idGenerator()(Orders.prototype, "orderId", {
        value: (): string => "order-1",
      });
    }).toThrow(
      "Orders.orderId: itinera's decorators need the compiler option emitDecoratorMetadata",
    );
  });
});

function orderOne(): string {
  return "order-1";
}
