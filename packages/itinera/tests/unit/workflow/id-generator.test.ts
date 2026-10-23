import { describe, expect, it } from "vitest";
import { Workflow } from "../../../src/workflow.js";
import { idGenerator } from "../../../src/workflow/id-generator.js";
import { declarationOf } from "../../../src/workflow/registry.js";

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
    }).toThrow("Orders.orderId: parameter 1 carries no request");
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
