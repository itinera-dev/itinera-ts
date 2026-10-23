import assert from "node:assert/strict";
import {
  Attempt,
  attempt,
  type JourneyId,
  journeyId,
  type Outcome,
  type Provided,
  provider,
  type ProviderDecorator,
  type ProviderOptions,
  providerReporter,
  type ProviderReporter,
  service,
  serviceType,
  Step,
  step,
  type StepName,
  stepName,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";

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

const perAttempt: ProviderOptions = {
  key: "payments",
  perAttempt: true,
  steps: ["charge"],
  name: "fresh gateway",
};
const journeyLong: ProviderDecorator<PaymentGateway> =
  provider(PAYMENT_GATEWAY);

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge" })
class Orders extends Workflow {
  @journeyLong
  async payments(
    @journeyId() id: JourneyId,
    @providerReporter() reporter: ProviderReporter,
  ): Promise<Provided<PaymentGateway>> {
    await reporter.info("gateway opened");
    return this.provide(
      { take: (amount) => `${id}: ${String(amount)}` },
      { region: "eu" },
    );
  }

  @provider(PAYMENT_GATEWAY, perAttempt)
  fresh(
    @stepName() step: StepName,
    @attempt() attempt: Attempt,
  ): Provided<PaymentGateway> {
    return this.provide({
      take: (amount) => `${step} ${String(attempt.number)}: ${String(amount)}`,
    });
  }
}

class Reported implements ProviderReporter {
  readonly lines: string[] = [];

  info(message: string): Promise<void> {
    return this.record(`info: ${message}`);
  }

  warning(message: string): Promise<void> {
    return this.record(`warning: ${message}`);
  }

  error(message: string): Promise<void> {
    return this.record(`error: ${message}`);
  }

  setGlobalMetadata(key: string): Promise<void> {
    return this.record(`metadata: ${key}`);
  }

  private record(line: string): Promise<void> {
    this.lines.push(line);
    return Promise.resolve();
  }
}

export default (async () => {
  const orders = Orders.build();
  const reporter = new Reported();

  const lent = await orders.payments("R-1" as JourneyId, reporter);
  const fresh = orders.fresh("charge" as StepName, Attempt.first);

  assert.equal(lent.instance.take(40), "R-1: 40");
  assert.deepEqual(lent.data, { region: "eu" });
  assert.deepEqual(reporter.lines, ["info: gateway opened"]);
  assert.equal(fresh.instance.take(40), "charge 1: 40");
  assert.equal(fresh.data, undefined);
})();
