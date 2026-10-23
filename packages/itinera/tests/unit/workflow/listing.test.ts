import { describe, expect, it } from "vitest";
import { Alarm, Audit } from "../../fixtures/policy.js";
import { stepPolicyGiven } from "../../../src/policy/step-policy/builder.js";
import {
  adapter,
  PAYMENTS,
  provider,
  step,
  STOCK,
} from "../../fixtures/workflow.js";
import { listingOf } from "../../../src/workflow/listing.js";

describe("the listing", () => {
  it("lists each step in order, with its position, its policies and its input adapter", () => {
    const policies = [stepPolicyGiven(Audit), stepPolicyGiven(Alarm)];
    expect(
      listingOf({
        steps: [step("charge", { policies }), step("ship")],
        adapters: [adapter("pricing", "charge")],
        providers: [],
      }),
    ).toEqual([
      {
        step: "charge",
        position: 1,
        policies: ["audit", "alarm"],
        adapter: "pricing",
        services: [],
      },
      { step: "ship", position: 2, policies: [], services: [] },
    ]);
  });

  it("leaves out the input adapter and the rescue section of a step that has neither", () => {
    const [ship] = listingOf({
      steps: [step("ship")],
      adapters: [],
      providers: [],
    });
    expect(ship).not.toHaveProperty("adapter");
    expect(ship).not.toHaveProperty("rescue");
  });

  it("lists the services a step requests, in order, each with the provider serving it", () => {
    const [charge] = listingOf({
      steps: [
        step("charge", {
          services: [
            ["stock", STOCK],
            ["payments", PAYMENTS],
          ],
        }),
      ],
      adapters: [],
      providers: [
        provider("everywhere"),
        provider("stockroom", { serviceKey: "stock", type: STOCK }),
        provider("till", { steps: ["charge"] }),
      ],
    });
    expect(charge?.services).toEqual([
      { key: "stock", provider: "stockroom" },
      { key: "payments", provider: "till" },
    ]);
  });

  it("lists a rescue section, with its own input adapter and services, but no position or policies", () => {
    const [charge] = listingOf({
      steps: [step("charge", { rescue: [["payments", PAYMENTS]] })],
      adapters: [adapter("credentials", "charge_rescue")],
      providers: [provider("refunds", { steps: ["charge_rescue"] })],
    });
    expect(charge?.rescue).toEqual({
      step: "charge_rescue",
      adapter: "credentials",
      services: [{ key: "payments", provider: "refunds" }],
    });
  });
});
