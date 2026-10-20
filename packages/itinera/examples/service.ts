import assert from "node:assert/strict";
import { service, serviceType, type ServiceType } from "itinera/service";
import { type Outcome, Step, step } from "itinera/step";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY: ServiceType<PaymentGateway> =
  serviceType<PaymentGateway>("PaymentGateway");

@step()
class Charge extends Step {
  override run(
    @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
  ): Outcome {
    payments.take(40);
    return this.succeed();
  }
}

const taken: number[] = [];
const gateway: PaymentGateway = {
  take: (amount) => {
    taken.push(amount);
    return `${String(amount)} paid`;
  },
};

new Charge().run(gateway);
assert.equal(PAYMENT_GATEWAY.name, "PaymentGateway");
assert.deepEqual(taken, [40]);
