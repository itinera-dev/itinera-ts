import { describe, expect, it } from "vitest";
import { Workflow } from "../../workflow.js";
import { isProvided, type Provided } from "./provided.js";

interface PaymentGateway {
  take(amount: number): string;
}

const gateway: PaymentGateway = { take: String };

class Payments extends Workflow {
  payments(): Provided<PaymentGateway> {
    return this.provide(gateway);
  }
}

describe("isProvided", () => {
  it("accepts what the workflow's helper makes", () => {
    expect(
      isProvided(Payments.builder().name("payments").build().payments()),
    ).toBe(true);
  });

  it.each([
    ["an instance a cast makes", { instance: gateway }],
    ["nothing", undefined],
  ])("refuses %s", (_, returned) => {
    expect(isProvided(returned)).toBe(false);
  });
});
