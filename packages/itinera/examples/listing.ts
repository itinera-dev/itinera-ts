import assert from "node:assert/strict";
import {
  type OnSuccess,
  onStepSuccess,
  StepPolicy,
  stepPolicy,
} from "itinera/policy";
import { type Provided, provider, service, serviceType } from "itinera/service";
import {
  type Outcome,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  Step,
  step,
} from "itinera/step";
import {
  inputAdapter,
  key,
  type ListedStep,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

@step()
class Charge extends Step {
  override run(
    @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
  ): Outcome {
    payments.take(40);
    return this.succeed();
  }
}

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@rescueStep()
class Refund extends RescueStep {
  override run(): RescueOutcome {
    return this.succeed();
  }
}

@stepPolicy({ name: "audit" })
class Audit extends StepPolicy {
  @onStepSuccess()
  audited(): OnSuccess {
    return this.keepDefault();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", policies: [Audit], rescue: Refund })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  @inputAdapter({ steps: ["charge"] })
  pricing(@key() inputKey: string): Supplied {
    return this.supply(inputKey.length);
  }

  @provider(PAYMENT_GATEWAY, { name: "gateway" })
  payments(): Provided<PaymentGateway> {
    return this.provide({ take: (amount) => `${String(amount)} paid` });
  }
}

const listing: readonly ListedStep[] = Orders.listing();

assert.deepEqual(listing, [
  {
    step: "charge",
    position: 1,
    policies: ["audit"],
    adapter: "pricing",
    services: [{ key: "payments", provider: "gateway" }],
    rescue: { step: "charge_rescue", services: [] },
  },
  { step: "ship", position: 2, policies: [], services: [] },
]);
assert.deepEqual(
  Orders.builder()
    .step(Ship.builder("return"))
    .listing()
    .map((listed) => listed.step),
  ["charge", "ship", "return"],
);
