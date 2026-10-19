import { describe, expect, it } from "vitest";
import { Audit, Ledger } from "../../fixtures/policy.js";
import { stepPolicyGiven } from "../../../src/policy/step-policy/builder.js";
import { adapter, PAYMENTS, provider, step } from "../../fixtures/workflow.js";
import type { StepName } from "../../../src/step.js";
import {
  type Violation,
  Violations,
  violationsOf,
} from "../../../src/workflow/violation.js";

describe("violationsOf", () => {
  it("finds nothing wrong with a workflow put together rightly", () => {
    expect(
      violationsOf({
        steps: [step("charge", { services: [["payments", PAYMENTS]] })],
        policies: [],
        adapters: [adapter("pricing", "charge")],
        providers: [provider("payments")],
      }),
    ).toEqual([]);
  });

  it("finds every violation, in the order of their kinds", () => {
    const found = violationsOf({
      steps: [
        step("charge", {
          services: [["payments", PAYMENTS]],
          policies: [stepPolicyGiven(Audit), stepPolicyGiven(Ledger)],
          rescue: [],
          retryBudget: 1,
        }),
        step("charge"),
      ],
      policies: [],
      adapters: [adapter("pricing", "pack"), adapter("pricing", "ship")],
      providers: [provider("payments", { scope: "journey", steps: ["pack"] })],
    });
    expect(found.map(kindOf)).toEqual([
      "duplicate step name",
      "rescued step retried",
      "hook defined twice",
      "duplicate adapter name",
      "input adapter for unknown step",
      "input adapter for unknown step",
      "service not provided",
      "service provider for unknown step",
    ]);
  });
});

describe("Violations", () => {
  const thrown = new Violations([
    { kind: "duplicate step name", step: "ship" as StepName },
    { kind: "duplicate step name", step: "charge" as StepName },
  ]);

  it("says each violation on a line of its own", () => {
    expect(thrown.message).toBe(
      "duplicate step name: ship\nduplicate step name: charge",
    );
  });

  it("is an error named Violations", () => {
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe("Violations");
  });

  it.each([
    [
      "a step hook",
      {
        kind: "hook defined twice",
        step: "charge",
        hook: "on step success",
        policies: [],
      },
      "hook defined twice: on step success on step charge",
    ],
    [
      "a workflow hook",
      { kind: "hook defined twice", hook: "on workflow success", policies: [] },
      "hook defined twice: on workflow success",
    ],
    [
      "a rescued step",
      { kind: "rescued step retried", step: "charge" },
      "rescued step retried: charge",
    ],
    [
      "a step adapted twice",
      { kind: "step adapted twice", step: "charge", adapters: [] },
      "step adapted twice: charge",
    ],
    [
      "an adapter's name",
      { kind: "duplicate adapter name", adapter: "pricing" },
      "duplicate adapter name: pricing",
    ],
    [
      "an adapter's unknown step",
      {
        kind: "input adapter for unknown step",
        adapter: "pricing",
        step: "pack",
      },
      "input adapter for unknown step: pricing on pack",
    ],
    [
      "a service not provided",
      { kind: "service not provided", step: "charge", key: "payments" },
      "service not provided: payments for charge",
    ],
    [
      "a service requested twice",
      { kind: "service requested twice", step: "charge", key: "payments" },
      "service requested twice: payments by charge",
    ],
    [
      "a service provided twice to no step",
      { kind: "service provided twice", key: "payments", providers: [] },
      "service provided twice: payments",
    ],
    [
      "a service provided twice to a step",
      {
        kind: "service provided twice",
        key: "payments",
        step: "charge",
        providers: [],
      },
      "service provided twice: payments for charge",
    ],
    [
      "a provider's name",
      { kind: "duplicate provider name", provider: "payments" },
      "duplicate provider name: payments",
    ],
    [
      "a provider's unknown step",
      {
        kind: "service provider for unknown step",
        provider: "payments",
        step: "pack",
      },
      "service provider for unknown step: payments on pack",
    ],
    [
      "a service of the wrong type",
      {
        kind: "wrong service type",
        step: "charge",
        key: "payments",
        provider: "stock",
      },
      "wrong service type: stock for payments of charge",
    ],
    [
      "an attempt requested in journey scope",
      { kind: "attempt request in journey scope", provider: "payments" },
      "attempt request in journey scope: payments",
    ],
  ])("says what %s concerns", (_, violation, message) => {
    expect(new Violations([violation as Violation]).message).toBe(message);
  });
});

function kindOf(violation: Violation): string {
  return violation.kind;
}
