import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { type Provided, provider, service, serviceType } from "itinera/service";
import { type Outcome, Step, step } from "itinera/step";
import { fakeProvider } from "itinera/testing";
import { withStep, Workflow, workflow } from "itinera/workflow";

interface PaymentGateway {
  take(amount: number): boolean;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

@step()
class Charge extends Step {
  override run(
    @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
  ): Outcome {
    return payments.take(40) ? this.succeed() : this.fail("declined");
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge" })
class Orders extends Workflow {
  @provider(PAYMENT_GATEWAY, { name: "live gateway" })
  payments(): Provided<PaymentGateway> {
    return this.provide({ take: () => true });
  }
}

export default (async () => {
  const instance = fakeProvider(
    Orders.build().instance({}),
    "live gateway",
    PAYMENT_GATEWAY,
    (provide) => provide({ take: () => false }, { fake: "declining" }),
  );

  const result = await new LocalExecutor().run(instance);

  assert.ok(result.isFailed());
  assert.equal(result.failure?.reason?.code, "declined");
})();
