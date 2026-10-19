import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import { type Outcome, Step } from "../step.js";
import { service, serviceType } from "./request.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

describe("serviceType", () => {
  it("is named as given", () => {
    expect(PAYMENT_GATEWAY.name).toBe("PaymentGateway");
  });

  it("is a new type each time, even under the same name", () => {
    expect(serviceType<PaymentGateway>("PaymentGateway")).not.toBe(
      PAYMENT_GATEWAY,
    );
  });

  it("cannot be changed", () => {
    expect(Object.isFrozen(PAYMENT_GATEWAY)).toBe(true);
  });

  it("refuses an empty name", () => {
    expect(() => serviceType("")).toThrow("a service type has an empty name");
  });
});

describe("service", () => {
  it("records the key and the service type", () => {
    class Charge extends Step {
      override run(
        @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
      ): Outcome {
        payments.take(1);
        return this.succeed();
      }
    }
    expect(requestsOf(Charge, "run")).toEqual([
      { kind: "service", key: "payments", type: PAYMENT_GATEWAY },
    ]);
  });
});
