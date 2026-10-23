import { describe, expect, it } from "vitest";
import type { JourneyId } from "../../../src/journey.js";
import { journeyId } from "../../../src/journey/request.js";
import { attempt, stepName } from "../../../src/step/request.js";
import type { Attempt, StepName } from "../../../src/step.js";
import { Charge, Refund, Ship } from "../../fixtures/step.js";
import { withStep, Workflow, workflow } from "../../../src/workflow.js";
import { inputAdapter, key } from "../../../src/workflow/adapter.js";
import type { Supplied } from "../../../src/workflow/adapter/supplied.js";
import { declarationOf } from "../../../src/workflow/registry.js";

@workflow({ name: "prices" })
@withStep(Charge, { name: "charge", rescue: Refund })
@withStep(Ship, { name: "ship" })
class Prices extends Workflow {
  @inputAdapter({ steps: ["charge", "charge_rescue"], name: "prices" })
  price(@stepName() step: StepName, @key() key: string): Supplied {
    return step === "charge" ? this.supply(key) : this.fromDataBag();
  }

  @inputAdapter({ steps: ["ship"] })
  address(@journeyId() id: JourneyId): Supplied {
    return this.supply(id);
  }
}

describe("inputAdapter", () => {
  it("records each adapter, its steps and its requests, in the order they are written", () => {
    expect(declarationOf(Prices).adapters).toEqual([
      {
        name: "prices",
        steps: ["charge", "charge_rescue"],
        key: "price",
        // eslint-disable-next-line @typescript-eslint/unbound-method -- compared, never called
        method: Prices.prototype.price,
        requests: [{ kind: "stepName" }, { kind: "key" }],
      },
      {
        name: "address",
        steps: ["ship"],
        key: "address",
        // eslint-disable-next-line @typescript-eslint/unbound-method -- compared, never called
        method: Prices.prototype.address,
        requests: [{ kind: "journeyId" }],
      },
    ]);
  });

  it("refuses an empty name", () => {
    expect(() => {
      class Orders extends Workflow {
        @inputAdapter({ steps: ["charge"], name: "" })
        price(): Supplied {
          return this.fromDataBag();
        }
      }
      return Orders;
    }).toThrow("the input adapter Orders.price has an empty name");
  });

  it("refuses what is not a method", () => {
    expect(() => {
      inputAdapter({ steps: ["charge"] })(Prices.prototype, "price", {
        get: () => undefined,
      } as never);
    }).toThrow("@inputAdapter marks a method, not Prices.price");
  });

  it("refuses a request an input adapter may not make", () => {
    expect(() => {
      class Orders extends Workflow {
        @inputAdapter({ steps: ["charge"] })
        price(@attempt() attempt: Attempt): Supplied {
          return this.supply(attempt.number);
        }
      }
      return Orders;
    }).toThrow("Orders.price: an input adapter cannot request @attempt");
  });

  it("refuses a parameter with no request", () => {
    expect(() => {
      class Orders extends Workflow {
        @inputAdapter({ steps: ["charge"] })
        price(step: string): Supplied {
          return this.supply(step);
        }
      }
      return Orders;
    }).toThrow("Orders.price: parameter 1 carries no request");
  });

  it("refuses a class that extends another workflow", () => {
    expect(() => {
      class Orders extends Prices {
        @inputAdapter({ steps: ["charge"] })
        discount(): Supplied {
          return this.fromDataBag();
        }
      }
      return Orders;
    }).toThrow("Orders must extend Workflow itself");
  });
});
