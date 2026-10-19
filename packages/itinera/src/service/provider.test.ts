import { describe, expect, it } from "vitest";
import type { DataBag, JourneyId } from "../journey.js";
import { dataBag, journeyId } from "../journey/request.js";
import { Charge } from "../step/fixtures.js";
import { attempt, stepName } from "../step/request.js";
import type { StepName } from "../step.js";
import { Attempt } from "../step/attempt.js";
import { withStep, Workflow, workflow } from "../workflow.js";
import { declarationOf } from "../workflow/registry.js";
import { isProvided, type Provided, provider } from "./provider.js";
import { providerReporter, type ProviderReporter } from "./reporter.js";
import { serviceType } from "./request.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

const gateway: PaymentGateway = { take: String };

@workflow({ name: "payments" })
@withStep(Charge, { name: "charge" })
class Payments extends Workflow {
  @provider(PAYMENT_GATEWAY)
  payments(
    @journeyId() id: JourneyId,
    @providerReporter() reporter: ProviderReporter,
  ): Provided<PaymentGateway> {
    return this.provide(gateway, { id, reporting: typeof reporter });
  }

  @provider(PAYMENT_GATEWAY, {
    perAttempt: true,
    steps: ["charge", "charge_rescue"],
    key: "payments",
    name: "fresh",
  })
  async perAttempt(
    @stepName() step: StepName,
    @attempt() attempt: Attempt,
  ): Promise<Provided<PaymentGateway>> {
    return Promise.resolve(
      this.provide(gateway, `${step} ${attempt.toString()}`),
    );
  }
}

describe("provider", () => {
  it("records each provider, its service and its requests, in the order they are written", () => {
    expect(declarationOf(Payments).providers).toEqual([
      {
        name: "payments",
        serviceKey: "payments",
        type: PAYMENT_GATEWAY,
        scope: "journey",
        steps: undefined,
        key: "payments",
        requests: [{ kind: "journeyId" }, { kind: "providerReporter" }],
      },
      {
        name: "fresh",
        serviceKey: "payments",
        type: PAYMENT_GATEWAY,
        scope: "attempt",
        steps: ["charge", "charge_rescue"],
        key: "perAttempt",
        requests: [{ kind: "stepName" }, { kind: "attempt" }],
      },
    ]);
  });

  it.each([
    [
      "name",
      { name: "" },
      "the service provider Orders.payments has an empty name",
    ],
    [
      "key",
      { key: "" },
      "the key of the service provider Orders.payments has an empty name",
    ],
  ])("refuses an empty %s", (_, options, message) => {
    expect(() => {
      class Orders extends Workflow {
        @provider(PAYMENT_GATEWAY, options)
        payments(): Provided<PaymentGateway> {
          return this.provide(gateway);
        }
      }
      return Orders;
    }).toThrow(message);
  });

  it("refuses a request a service provider may not make", () => {
    expect(() => {
      class Orders extends Workflow {
        @provider(PAYMENT_GATEWAY)
        payments(@dataBag() bag: DataBag): Provided<PaymentGateway> {
          return this.provide(gateway, bag.keys());
        }
      }
      return Orders;
    }).toThrow("Orders.payments: a service provider cannot request @dataBag");
  });
});

describe("isProvided", () => {
  it("accepts what the workflow's helper makes", async () => {
    const payments = Payments.build();
    expect(
      isProvided(
        await payments.perAttempt("charge" as StepName, Attempt.first),
      ),
    ).toBe(true);
  });

  it.each([
    ["an instance a cast makes", { instance: gateway }],
    ["nothing", undefined],
  ])("refuses %s", (_, returned) => {
    expect(isProvided(returned)).toBe(false);
  });
});
