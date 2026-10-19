import { describe, expect, it } from "vitest";
import { type DataBag, dataBag, journeyId } from "../../../src/journey.js";
import { Workflow } from "../../../src/workflow.js";
import { idGenerator } from "../../../src/workflow/id-generator.js";
import { declarationOf } from "../../../src/workflow/registry.js";

describe("idGenerator", () => {
  it("records the method it marks, and its requests", () => {
    class Orders extends Workflow {
      @idGenerator()
      orderId(@dataBag() data: DataBag): string {
        return data.keys().join("-");
      }
    }
    const declared = declarationOf(Orders).idGenerator;
    expect(declared).toMatchObject({
      key: "orderId",
      requests: [{ kind: "dataBag" }],
    });
    expect(declared?.method).toBe(
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
        orderId(data?: DataBag): string {
          return data === undefined ? "order-1" : "order-2";
        }
      }
      return Orders;
    }).toThrow("Orders.orderId: parameter 1 carries no request");
  });

  it("refuses a request an ID generator may not make, which a parameter of type unknown lets through", () => {
    expect(() => {
      class Orders extends Workflow {
        @idGenerator()
        orderId(@journeyId() id: unknown): string {
          return String(id);
        }
      }
      return Orders;
    }).toThrow("Orders.orderId: an ID generator cannot request @journeyId");
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
