import assert from "node:assert/strict";
import {
  type Attempt,
  attempt,
  type Contributor,
  contributor,
  input,
  integer,
  key,
  type Outcome,
  type Provided,
  service,
  serviceType,
  Step,
  type StepName,
  stepName,
  string,
  type Supplied,
  Workflow,
} from "itinera/unstable";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

class Charge extends Step {
  constructor(readonly amount: number) {
    super();
  }

  override run(payments: PaymentGateway, contributing: Contributor): Outcome {
    contributing.contribute("payment", payments.take(this.amount));
    return this.succeed();
  }
}

class Orders extends Workflow {
  pricing(step: StepName, inputKey: string): Supplied {
    return this.supply(step === "charge" && inputKey === "amount" ? 40 : 0);
  }

  payments(attempted: Attempt): Provided<PaymentGateway> {
    return this.provide({
      take: (amount) => `${String(amount)} paid, attempt ${String(attempted)}`,
    });
  }
}

const orders = Orders.builder()
  .name("orders")
  .step(
    Charge.builder("charge")
      .needs(input("amount", integer))
      .run(service("payments", PAYMENT_GATEWAY), contributor()),
  )
  .inputAdapter("pricing", { steps: ["charge"] }, stepName(), key())
  .provider("payments", PAYMENT_GATEWAY, { perAttempt: true }, attempt())
  .build();

assert.deepEqual(
  orders
    .instance()
    .descriptor.steps()
    .map((described) => described.name),
  ["charge"],
);

// @ts-expect-error the amount is a number, so it cannot be read as a string
Charge.builder("charge").needs(input("amount", string));

assert.throws(
  // @ts-expect-error run takes two parameters, and each needs its request
  () => Charge.builder("charge").run(service("payments", PAYMENT_GATEWAY)),
  /Charge.run: parameter 2 carries no request/,
);

Orders.builder().inputAdapter(
  // @ts-expect-error payments provides a service, it does not supply an input
  "payments",
  { steps: ["charge"] },
  stepName(),
  key(),
);
