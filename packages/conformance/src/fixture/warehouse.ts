/**
 * The warehouse workflow: reserves an order's goods, charges it and ships
 * it, through the stock and the payments its service providers supply.
 */
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
  type Provided,
  provider,
  providerReporter,
  type ProviderReporter,
  service,
  serviceType,
} from "itinera/service";
import {
  attempt,
  type Attempt,
  type Outcome,
  Step,
  step,
  type StepName,
  stepName,
} from "itinera/step";
import { optional, string } from "itinera/value";
import {
  fromWorkflow,
  idGenerator,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

/** The goods of a journey, which every step that needs them shares. */
interface Stock {
  readonly label: string;
}

/** Takes payments, unless its gateway is unreachable. */
interface Payments {
  readonly label: string;
  readonly reachable: boolean;
}

const STOCK = serviceType<Stock>("Stock");
const PAYMENTS = serviceType<Payments>("Payments");

/** Reserves the order's goods. */
@step()
class Reserve extends Step {
  override run(
    @service("stock", STOCK) stock: Stock,
    @contributor() contributor: Contributor,
  ): Outcome {
    contributor.contribute("reserved", stock.label);
    return this.succeed();
  }
}

/** Charges the order, which may be retried while the gateway is unreachable. */
@step()
class Charge extends Step {
  override run(
    @service("payments", PAYMENTS) payments: Payments,
    @service("stock", STOCK) stock: Stock,
    @contributor() contributor: Contributor,
  ): Outcome {
    if (!payments.reachable) {
      return this.fail("unreachable");
    }
    contributor.contribute("charged", used(payments, stock));
    return this.succeed();
  }
}

/** Ships the order. */
@step()
class Ship extends Step {
  override run(
    @service("payments", PAYMENTS) payments: Payments,
    @service("stock", STOCK) stock: Stock,
    @contributor() contributor: Contributor,
  ): Outcome {
    contributor.contribute("shipped", used(payments, stock));
    return this.succeed();
  }
}

/** The labels of the services a step used. */
function used(payments: Payments, stock: Stock): string {
  return `${payments.label} with ${stock.label}`;
}

/** The warehouse workflow, whose services its providers supply. */
@workflow({ name: "warehouse" })
@withStep(Reserve, { name: "reserve" })
@withStep(Charge, { name: "charge", retryBudget: 1 })
@withStep(Ship, { name: "ship" })
export class Warehouse extends Workflow {
  /** The journey's stock, made once and lent to every step and attempt. */
  @provider(STOCK)
  stock(@journeyId() id: JourneyId): Provided<Stock> {
    return this.provide({ label: `stock of ${id}` });
  }

  /** The payments of every step without a provider of its own for them. */
  @provider(PAYMENTS)
  payments(): Provided<Payments> {
    return this.provide({ label: "payments", reachable: true });
  }

  /**
   * Fresh payments for each attempt to charge, through the gateway the data
   * bag names: the main one unless it names another. A flaky gateway is
   * unreachable on a first attempt, and one that is down cannot be made.
   */
  @provider(PAYMENTS, {
    key: "payments",
    perAttempt: true,
    steps: ["charge"],
    name: "fresh payments",
  })
  async freshPayments(
    @stepName() step: StepName,
    @attempt() attempt: Attempt,
    @fromWorkflow("gateway", optional(string)) gateway: Option<string>,
    @providerReporter() reporter: ProviderReporter,
  ): Promise<Provided<Payments>> {
    const chosen = gateway.unwrapOr("main");
    if (chosen === "down") {
      throw new Error("gateway down");
    }
    await reporter.info(`choosing the ${chosen} gateway`);
    return this.provide({
      label: `${chosen} gateway for ${step}, attempt ${String(attempt.number)}`,
      reachable: chosen !== "flaky" || !attempt.isFirst(),
    });
  }

  @idGenerator()
  orderId(@dataBag() data: DataBag): string {
    const order = data.read("order", string).option();
    return `order-${order.unwrapOr("unnumbered")}`;
  }
}
