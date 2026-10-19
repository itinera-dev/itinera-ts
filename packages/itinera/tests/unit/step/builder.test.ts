import { describe, expect, it } from "vitest";
import type { Contributor } from "../../../src/journey.js";
import { contributor } from "../../../src/journey/contributor.js";
import { Audit, Tally } from "../../fixtures/policy.js";
import { retryCause } from "../../../src/policy/request.js";
import { service, serviceType } from "../../../src/service/request.js";
import { type Outcome, Step } from "../../../src/step.js";
import { integer } from "../../../src/value/token.js";
import { describedBy, type StepBuilder } from "../../../src/step/builder.js";
import { requestsOfDescribed, rescueOf } from "../../../src/step/descriptor.js";
import { Refund, Ship } from "../../fixtures/step.js";
import { input } from "../../../src/step/request.js";

const PAYMENTS = serviceType<{ take(amount: number): string }>("Payments");

class Charge extends Step {
  constructor(readonly amount: number) {
    super();
  }

  override run(
    payments: { take(amount: number): string },
    contributing: Contributor,
  ): Outcome {
    contributing.contribute("payment", payments.take(this.amount));
    return this.succeed();
  }
}

/** A step's builder whose `needs` takes anything, as its methods' bivariance lets through. */
function loosely(builder: StepBuilder<typeof Charge>): {
  needs(...requests: unknown[]): unknown;
} {
  return builder;
}

function charge() {
  return Charge.builder("charge").needs(input("amount", integer));
}

describe("Step.builder", () => {
  it("names the step, gives it no retries, and retries abnormal terminations, unless told otherwise", () => {
    expect(describedBy(Ship.builder("ship"))).toMatchObject({
      name: "ship",
      retryBudget: 0,
      retryOnAbnormalTermination: true,
    });
  });

  it("keeps the retries it is told", () => {
    const described = describedBy(
      Ship.builder("ship").retryBudget(3).noRetryOnAbnormalTermination(),
    );
    expect(described.retryBudget).toBe(3);
    expect(described.retryOnAbnormalTermination).toBe(false);
  });

  it("describes a step of its own class", () => {
    expect(describedBy(Ship.builder("ship")).build()).toBeInstanceOf(Ship);
  });

  it("refuses an empty name at once", () => {
    expect(() => Ship.builder("")).toThrow(
      "a step of class Ship has an empty name",
    );
  });

  it.each([
    ["a negative number", -1],
    ["a fraction", 1.5],
  ])("refuses at once a retry budget that is %s", (_, retries) => {
    expect(() => Ship.builder("ship").retryBudget(retries)).toThrow(
      `step ship has a retry budget of ${String(retries)}, not a whole number from 0`,
    );
  });
});

describe("requests given by position", () => {
  it("are the step's requests, in order", () => {
    const described = describedBy(
      charge().run(service("payments", PAYMENTS), contributor()),
    );
    expect(requestsOfDescribed(described)).toEqual({
      needs: [
        {
          kind: "input",
          key: "amount",
          type: { schema: integer, optional: false },
        },
      ],
      run: [
        { kind: "service", key: "payments", type: PAYMENTS },
        { kind: "contributor" },
      ],
    });
  });

  it("refuse a step whose parameter is left without a request, when it is given to the workflow", () => {
    const builder = Charge.builder("charge");
    expect(() => describedBy(builder)).toThrow(
      "the constructor of Charge: parameter 1 carries no request",
    );
  });

  it("refuse at once a parameter left without a request", () => {
    expect(() => loosely(Charge.builder("charge")).needs()).toThrow(
      "the constructor of Charge: parameter 1 carries no request",
    );
  });
});

describe("a step's policies and rescue step", () => {
  it("are attached in order, a declared class or a policy's builder", () => {
    const described = describedBy(
      Ship.builder("ship")
        .policy(Audit)
        .policy(Tally.builder("tally").onStepRetry("retried", retryCause())),
    );
    expect(described.policies().map((policy) => policy.name)).toEqual([
      "audit",
      "tally",
    ]);
  });

  it("are attached to a new builder, leaving the builder they were given to as it was", () => {
    const builder = Ship.builder("ship");
    const attached = builder.policy(Audit);
    expect(describedBy(builder).policies()).toEqual([]);
    expect(describedBy(attached).policies()).toHaveLength(1);
  });

  it("refuse at once a policy class not declared with @stepPolicy", () => {
    expect(() => Ship.builder("ship").policy(Tally)).toThrow(
      "Tally is not declared with @stepPolicy",
    );
  });

  it("take a declared rescue step class", () => {
    expect(rescueOf(describedBy(Ship.builder("ship").rescue(Refund)))).toEqual({
      name: "ship_rescue",
      step: Refund,
      requests: { needs: [], run: [] },
    });
  });
});
