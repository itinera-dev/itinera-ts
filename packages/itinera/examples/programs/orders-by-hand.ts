/**
 * The workflow of `orders.ts`, put together with the builder alone, as an
 * application whose compiler records no decorator metadata, such as esbuild,
 * declares it. The tests run it, and
 * `npx vitest run packages/itinera/tests/integration/examples.test.ts -t programs/orders-by-hand.ts`
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
  type OnSuccess,
  role,
  StepPolicy,
  WorkflowPolicy,
} from "itinera/policy";
import type { Reporter } from "itinera/report";
import { type Provided, service, serviceType } from "itinera/service";
import { type Attempt, attempt, input, type Outcome, Step } from "itinera/step";
import { integer, optional, string } from "itinera/value";
import { fromWorkflow, type Supplied, Workflow } from "itinera/workflow";

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
class Charge extends Step {
  constructor(private readonly amount: number) {
    super();
  }

  override run(payments: PaymentGateway, contributor: Contributor): Outcome {
    if (this.amount <= 0) return this.fail("declined");
    contributor.contribute("payment", payments.take(this.amount));
    contributor.contribute("charged", this.amount);
    return this.succeed();
  }
}

/** Ships the order. */
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

/** Notes each amount charged. */
class Audit extends StepPolicy {
  audited(charged: number, contributor: Contributor): OnSuccess {
    contributor.contribute("audit", `charged ${String(charged)}`);
    return this.keepDefault();
  }
}

/** A role the shop provides: telling a customer something. */
interface Messages {
  tell(message: string): void;
}

/** Tells the customer once the order is paid and shipped. */
class Notify extends WorkflowPolicy<Messages> {
  paid(
    id: JourneyId,
    charged: number,
    payment: string,
    messages: Messages,
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

class Orders extends Workflow implements Messages {
  constructor(private readonly shop: string) {
    super();
  }

  tell(message: string): void {
    console.log(`${this.shop}: ${message}`);
  }

  /** Works out the amount to charge: the price, less any discount. */
  pricing(price: number, discount: Option<number>): Supplied {
    return this.supply(price - discount.unwrapOr(0));
  }

  /** Lends each attempt to charge the shop's card terminal. */
  payments(attempt: Attempt): Provided<PaymentGateway> {
    return this.provide(new Terminal(this.shop, attempt));
  }

  /** Names each journey after the shop and the order. */
  orderId(data: DataBag): string {
    const order = data.read("order", string).option();
    return `${this.shop}-${order.unwrapOr("unknown")}`;
  }
}

const audit = Audit.builder("audit").onStepSuccess(
  "audited",
  fromStep("charged", integer),
  contributor(),
);

const notify = Notify.builder("notify").onWorkflowSuccess(
  "paid",
  journeyId(),
  fromWorkflow("charged", integer),
  fromWorkflow("payment", string),
  role<Messages>(),
);

const shop = Orders.builder()
  .name("orders")
  .step(
    Charge.builder("charge")
      .retryBudget(1)
      .needs(input("amount", integer))
      .run(service("payments", PAYMENT_GATEWAY), contributor())
      .policy(audit),
  )
  .step(Ship.builder("ship"))
  .policy(notify)
  .reporter(Printer)
  .inputAdapter(
    "pricing",
    { steps: ["charge"] },
    fromWorkflow("price", integer),
    fromWorkflow("discount", optional(integer)),
  )
  .provider(
    "payments",
    PAYMENT_GATEWAY,
    { perAttempt: true, steps: ["charge"] },
    attempt(),
  )
  .idGenerator("orderId", dataBag())
  .constructWith("corner")
  .build();

const orders = [
  { order: "1", price: 40, discount: 5 },
  { order: "2", price: 10, discount: 10 },
];

export default (async () => {
  const executor = new LocalExecutor();
  for (const order of orders) {
    const result = await executor.run(shop.instance(order));
    console.log(`${result.journeyId}: ${result.status.kind}`);
  }
})();
