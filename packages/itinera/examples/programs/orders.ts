/**
 * A workflow declared with the decorators: it charges an order, less its
 * discount, through the shop's card terminal, then ships it, and tells the
 * customer once the order is paid and shipped. The tests run it, and
 * `npx vitest run packages/itinera/tests/integration/examples.test.ts -t programs/orders.ts`
 * shows what it prints.
 */
import type { Event } from "itinera/event";
import { LocalExecutor } from "itinera/executor";
import {
  type Contributor,
  contributor,
  type DataBag,
  dataBag,
  type JourneyId,
  journeyId,
} from "itinera/journey";
import type { Option } from "itinera/option";
import {
  fromStep,
  onStepSuccess,
  type OnSuccess,
  onWorkflowSuccess,
  role,
  StepPolicy,
  stepPolicy,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/policy";
import type { Reporter } from "itinera/report";
import { type Provided, provider, service, serviceType } from "itinera/service";
import {
  type Attempt,
  attempt,
  input,
  type Outcome,
  Step,
  step,
} from "itinera/step";
import { integer, optional, string } from "itinera/value";
import {
  fromWorkflow,
  idGenerator,
  inputAdapter,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

/** Takes payments: the service a charge is paid through. */
interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

/** The shop's card terminal, lent to one attempt to charge. */
class Terminal implements PaymentGateway {
  constructor(
    private readonly shop: string,
    private readonly attempt: Attempt,
  ) {}

  take(amount: number): string {
    return `${String(amount)} paid at the ${this.shop} terminal, attempt ${String(this.attempt)}`;
  }
}

/**
 * Charges the amount the workflow's pricing works out, through the payment
 * gateway. A charge of nothing is declined, which may be retried.
 */
@step()
class Charge extends Step {
  constructor(@input("amount", integer) private readonly amount: number) {
    super();
  }

  override run(
    @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
    @contributor() contributor: Contributor,
  ): Outcome {
    if (this.amount <= 0) return this.fail("declined");
    contributor.contribute("payment", payments.take(this.amount));
    contributor.contribute("charged", this.amount);
    return this.succeed();
  }
}

/** Ships the order. */
@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

/** Notes each amount charged. */
@stepPolicy({ name: "audit" })
class Audit extends StepPolicy {
  @onStepSuccess()
  audited(
    @fromStep("charged", integer) charged: number,
    @contributor() contributor: Contributor,
  ): OnSuccess {
    contributor.contribute("audit", `charged ${String(charged)}`);
    return this.keepDefault();
  }
}

/** A role the shop provides: telling a customer something. */
interface Messages {
  tell(message: string): void;
}

/** Tells the customer once the order is paid and shipped. */
@workflowPolicy({ name: "notify" })
class Notify extends WorkflowPolicy<Messages> {
  @onWorkflowSuccess()
  paid(
    @journeyId() id: JourneyId,
    @fromWorkflow("charged", integer) charged: number,
    @fromWorkflow("payment", string) payment: string,
    @role<Messages>() messages: Messages,
  ): void {
    messages.tell(`order ${id}: paid ${String(charged)}, ${payment}`);
  }
}

/** Prints each event of every journey. */
class Printer implements Reporter {
  report(event: Event): void {
    console.log(event.journeyId, event.kind);
  }
}

@workflow({ name: "orders", policies: [Notify], reporters: [Printer] })
@withStep(Charge, { name: "charge", retryBudget: 1, policies: [Audit] })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow implements Messages {
  constructor(private readonly shop: string) {
    super();
  }

  tell(message: string): void {
    console.log(`${this.shop}: ${message}`);
  }

  /** Works out the amount to charge: the price, less any discount. */
  @inputAdapter({ steps: ["charge"] })
  pricing(
    @fromWorkflow("price", integer) price: number,
    @fromWorkflow("discount", optional(integer)) discount: Option<number>,
  ): Supplied {
    return this.supply(price - discount.unwrapOr(0));
  }

  /** Lends each attempt to charge the shop's card terminal. */
  @provider(PAYMENT_GATEWAY, { perAttempt: true, steps: ["charge"] })
  payments(@attempt() attempt: Attempt): Provided<PaymentGateway> {
    return this.provide(new Terminal(this.shop, attempt));
  }

  /** Names each journey after the shop and the order. */
  @idGenerator()
  orderId(@dataBag() data: DataBag): string {
    const order = data.read("order", string).option();
    return `${this.shop}-${order.unwrapOr("unknown")}`;
  }
}

const orders = [
  { order: "1", price: 40, discount: 5 },
  { order: "2", price: 10, discount: 10 },
];

export default (async () => {
  const executor = new LocalExecutor();
  const shop = Orders.build("corner");
  for (const order of orders) {
    const result = await executor.run(shop.instance(order));
    console.log(`${result.journeyId}: ${result.status.kind}`);
  }
})();
