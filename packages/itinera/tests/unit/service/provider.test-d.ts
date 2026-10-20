import { describe, expectTypeOf, it } from "vitest";
import type { JourneyId } from "../../../src/journey.js";
import { journeyId } from "../../../src/journey/request.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { Workflow } from "../../../src/workflow.js";
import { provider } from "../../../src/service/provider.js";
import type { Provided } from "../../../src/service/provider/provided.js";
import { providerReporter, type ProviderReporter } from "../../../src/service/reporter.js";
import { serviceType } from "../../../src/service/request.js";

interface PaymentGateway {
  take(amount: number): string;
}

interface Mailer {
  send(message: string): void;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

const gateway: PaymentGateway = { take: String };

describe("provider", () => {
  it("compiles on a method of a workflow that provides the service type", () => {
    class Orders extends Workflow {
      @provider(PAYMENT_GATEWAY)
      async payments(
        @journeyId() id: JourneyId,
        @providerReporter() reporter: ProviderReporter,
      ): Promise<Provided<PaymentGateway>> {
        await reporter.info(id);
        return this.provide(gateway, { region: "eu" });
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("does not compile on a method that provides another service, or a bare instance", () => {
    const mailer: Mailer = { send: String };
    class Orders extends Workflow {
      // @ts-expect-error a mailer is not a payment gateway
      @provider(PAYMENT_GATEWAY)
      payments(): Provided<Mailer> {
        return this.provide(mailer);
      }

      // @ts-expect-error a provider returns this.provide(instance)
      @provider(PAYMENT_GATEWAY)
      refunds(): PaymentGateway {
        return gateway;
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("does not compile with an empty list of steps", () => {
    class Orders extends Workflow {
      // @ts-expect-error a provider names one step or more, or leaves its steps out
      @provider(PAYMENT_GATEWAY, { steps: [] })
      payments(): Provided<PaymentGateway> {
        return this.provide(gateway);
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("does not compile outside a workflow", () => {
    class Audit extends StepPolicy {
      // @ts-expect-error only a workflow has service providers
      @provider(PAYMENT_GATEWAY)
      payments(): Provided<PaymentGateway> {
        return { instance: gateway } as Provided<PaymentGateway>;
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
  });

  it("gives reporters only data that is a value", () => {
    class Orders extends Workflow {
      @provider(PAYMENT_GATEWAY)
      payments(): Provided<PaymentGateway> {
        // @ts-expect-error a function is not a value
        return this.provide(gateway, () => "eu");
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
  });

  it("cannot be made from a plain object", () => {
    // @ts-expect-error only this.provide makes what a provider returns
    const made: Provided<PaymentGateway> = { instance: gateway };
    expectTypeOf(made).not.toBeNever();
  });
});
