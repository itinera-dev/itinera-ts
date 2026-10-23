import { describe, expect, it } from "vitest";
import { PAYMENTS, provider, STOCK, step } from "../../../fixtures/workflow.js";
import { serviceViolations } from "../../../../src/workflow/violation/services.js";

describe("serviceViolations", () => {
  it("finds nothing wrong with every service served with its type", () => {
    expect(
      serviceViolations(
        [step("charge", { services: [["payments", PAYMENTS]] })],
        [provider("payments")],
      ),
    ).toEqual([]);
  });

  it("names a service no provider serves for the step", () => {
    expect(
      serviceViolations(
        [step("charge", { services: [["payments", PAYMENTS]] })],
        [provider("refunds", { steps: ["refund"] })],
      ),
    ).toEqual([
      { kind: "service not provided", step: "charge", key: "payments" },
    ]);
  });

  it("names a key requested twice, and whether it is served once", () => {
    expect(
      serviceViolations(
        [
          step("charge", {
            services: [
              ["payments", PAYMENTS],
              ["payments", PAYMENTS],
            ],
          }),
        ],
        [],
      ),
    ).toEqual([
      { kind: "service requested twice", step: "charge", key: "payments" },
      { kind: "service not provided", step: "charge", key: "payments" },
    ]);
  });

  it("names the provider serving another type than the step requests", () => {
    expect(
      serviceViolations(
        [step("charge", { services: [["payments", STOCK]] })],
        [provider("payments")],
      ),
    ).toEqual([
      {
        kind: "wrong service type",
        step: "charge",
        key: "payments",
        provider: "payments",
      },
    ]);
  });

  it("checks a rescue step's services, which a provider of its step does not serve", () => {
    expect(
      serviceViolations(
        [step("charge", { rescue: [["payments", PAYMENTS]] })],
        [provider("charging", { steps: ["charge"] })],
      ),
    ).toEqual([
      { kind: "service not provided", step: "charge_rescue", key: "payments" },
    ]);
  });
});
