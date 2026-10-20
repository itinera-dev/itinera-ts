import { describe, expect, it } from "vitest";
import type { DataBag, JourneyId } from "../../../src/journey.js";
import { dataBag, journeyId } from "../../../src/journey/request.js";
import { Charge, Refund } from "../../fixtures/step.js";
import { attempt, stepName } from "../../../src/step/request.js";
import type { StepName } from "../../../src/step.js";
import { Attempt } from "../../../src/step/attempt.js";
import { withStep, Workflow, workflow } from "../../../src/workflow.js";
import { declarationOf } from "../../../src/workflow/registry.js";
import { provider } from "../../../src/service/provider.js";
import type { Provided } from "../../../src/service/provider/provided.js";
import { providerReporter, type ProviderReporter } from "../../../src/service/reporter.js";
import { serviceType } from "../../../src/service/request.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

const gateway: PaymentGateway = { take: String };

@workflow({ name: "payments" })
@withStep(Charge, { name: "charge", rescue: Refund })
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
        method: Reflect.get(Payments.prototype, "payments"),
        requests: [{ kind: "journeyId" }, { kind: "providerReporter" }],
      },
      {
        name: "fresh",
        serviceKey: "payments",
        type: PAYMENT_GATEWAY,
        scope: "attempt",
        steps: ["charge", "charge_rescue"],
        key: "perAttempt",
        method: Reflect.get(Payments.prototype, "perAttempt"),
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

  it("refuses what is not a method", () => {
    expect(() => {
      provider(PAYMENT_GATEWAY)(Payments.prototype, "payments", {
        get: () => undefined,
      } as never);
    }).toThrow("@provider marks a method, not Payments.payments");
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
