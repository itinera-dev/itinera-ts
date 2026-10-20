/**
 * The payment workflow: charges an order's price, less its discount, then
 * ships it, once it is packed when it is fragile.
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
  fromStep,
  onStepSuccess,
  type OnSuccess,
  onWorkflowFailure,
  onWorkflowSuccess,
  role,
  StepPolicy,
  stepPolicy,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/policy";
import {
  failureReason,
  input,
  type Outcome,
  type Reason,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  Step,
  step,
} from "itinera/step";
import { boolean, integer, optional, string } from "itinera/value";
import {
  fromWorkflow,
  idGenerator,
  inputAdapter,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

/** Charges the amount an input adapter supplies. */
@step()
class Charge extends Step {
  constructor(@input("amount", integer) readonly amount: number) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    if (this.amount <= 0) {
      return this.fail("declined");
    }
    contributor.contribute("charged", this.amount);
    return this.succeed();
  }
}

/** Ships the order, unless it is fragile and not packed. */
@step()
class Ship extends Step {
  constructor(
    @input("fragile", optional(boolean)) readonly fragile: Option<boolean>,
    @input("packed", optional(boolean)) readonly packed: Option<boolean>,
  ) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    if (this.fragile.unwrapOr(false) && this.packed.isNone()) {
      return this.fail("unpacked");
    }
    contributor.contribute("shipped", true);
    return this.succeed();
  }
}

/** Packs an order that could not be shipped, saying why. */
@rescueStep()
class Pack extends RescueStep {
  constructor(
    @input("order", string) readonly order: string,
    @failureReason() readonly reason: Reason,
  ) {
    super();
  }

  override run(@contributor() contributor: Contributor): RescueOutcome {
    contributor.contribute("packed", true);
    contributor.contribute(
      "packing",
      `order ${this.order} packed, since it was ${this.reason.code}`,
    );
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
    contributor.contribute("audited", `charged ${String(charged)}`);
    return this.keepDefault();
  }
}

/** A role of the payment workflow: the shop its receipts name. */
interface Shop {
  shop(): string;
}

/** Gives a receipt for a paid order, and notes a declined one. */
@workflowPolicy({ name: "receipt" })
class Receipt extends WorkflowPolicy<Shop> {
  @onWorkflowSuccess()
  paid(
    @journeyId() id: JourneyId,
    @fromWorkflow("charged", integer) charged: number,
    @role<Shop>() shop: Shop,
    @contributor() contributor: Contributor,
  ): void {
    contributor.contribute(
      "receipt",
      `${id} paid ${String(charged)} at the ${shop.shop()} shop`,
    );
  }

  @onWorkflowFailure()
  declined(@contributor() contributor: Contributor): void {
    contributor.contribute("receipt", "declined");
  }
}

/** The payment workflow of one shop. */
@workflow({ name: "payment", policies: [Receipt] })
@withStep(Charge, { name: "charge", retryBudget: 1, policies: [Audit] })
@withStep(Ship, { name: "ship", rescue: Pack })
export class Payment extends Workflow implements Shop {
  constructor(private readonly shopName: string) {
    super();
  }

  shop(): string {
    return this.shopName;
  }

  @inputAdapter({ steps: ["charge"] })
  pricing(
    @fromWorkflow("price", optional(integer)) price: Option<number>,
    @fromWorkflow("discount", optional(integer)) discount: Option<number>,
  ): Supplied {
    return price.isSome()
      ? this.supply(price.value - discount.unwrapOr(0))
      : this.fromDataBag();
  }

  @idGenerator()
  orderId(@dataBag() data: DataBag): string {
    const order = data.read("order", string).option();
    return `${this.shopName}-${order.unwrapOr("unnumbered")}`;
  }
}
