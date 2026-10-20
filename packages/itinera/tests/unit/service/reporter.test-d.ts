import { describe, expectTypeOf, it } from "vitest";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { Workflow } from "../../../src/workflow.js";
import { provider } from "../../../src/service/provider.js";
import type { Provided } from "../../../src/service/provider/provided.js";
import { providerReporter, type ProviderReporter } from "../../../src/service/reporter.js";
import { serviceType } from "../../../src/service/request.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

const gateway: PaymentGateway = { take: String };

describe("providerReporter", () => {
  it("does not compile on a parameter of another type, or outside a workflow", () => {
    class Orders extends Workflow {
      @provider(PAYMENT_GATEWAY)
      payments(
        // @ts-expect-error a provider reporter is not a string
        @providerReporter() reporter: string,
      ): Provided<PaymentGateway> {
        return this.provide(gateway, reporter);
      }
    }
    class Audit extends StepPolicy {
      audited(
        // @ts-expect-error a hook is given a hook reporter
        @providerReporter() reporter: ProviderReporter,
      ): ProviderReporter {
        return reporter;
      }
    }
    expectTypeOf(Orders).toBeConstructibleWith();
    expectTypeOf(Audit).toBeConstructibleWith();
  });
});
