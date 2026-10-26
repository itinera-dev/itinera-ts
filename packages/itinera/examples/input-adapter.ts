import assert from "node:assert/strict";
import {
  type DataBag,
  dataBag,
  type FromDataBag,
  fromWorkflow,
  input,
  inputAdapter,
  type InputAdapterOptions,
  integer,
  type JourneyId,
  journeyId,
  key,
  LocalExecutor,
  type Outcome,
  type StepName,
  stepName,
  Step,
  step,
  type Supplied,
  type SuppliedValue,
  string,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";

@step()
class Charge extends Step {
  static charged: number[] = [];

  constructor(@input("amount", integer) readonly amount: number) {
    super();
  }

  override run(): Outcome {
    Charge.charged.push(this.amount);
    return this.succeed();
  }
}

const adapting: InputAdapterOptions = { steps: ["charge"], name: "prices" };

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge" })
class Orders extends Workflow {
  readonly asked: string[] = [];

  constructor(readonly prices: ReadonlyMap<string, number>) {
    super();
  }

  @inputAdapter(adapting)
  price(
    @stepName() step: StepName,
    @key() key: string,
    @fromWorkflow("order", string) order: string,
    @journeyId() id: JourneyId,
    @dataBag() bag: DataBag,
  ): Supplied {
    this.asked.push(`${id}: ${step} ${key}`);
    const price = this.prices.get(order);
    return price === undefined || bag.read(key, integer).kind === "present"
      ? this.fromDataBag()
      : this.supply(price);
  }
}

export default (async () => {
  const orders = Orders.build(new Map([["A-1", 40]]));
  const supplying = orders.instance(new Map([["order", "A-1"]]));
  const reading = orders.instance(
    new Map<string, string | number>([
      ["order", "A-1"],
      ["amount", 25],
    ]),
  );

  const supplied = await new LocalExecutor().run(supplying);
  const read = await new LocalExecutor().run(reading);

  assert.deepEqual(Charge.charged, [40, 25]);
  assert.deepEqual(orders.asked, [
    `${supplying.journeyId}: charge amount`,
    `${reading.journeyId}: charge amount`,
  ]);
  assert.ok(supplied.isSucceeded() && read.isSucceeded());
  const charge = "charge" as StepName;
  assert.deepEqual(
    orders.price(
      charge,
      "amount",
      "A-1",
      supplying.journeyId,
      supplied.status.dataBag,
    ),
    { kind: "supplied", value: 40 } satisfies SuppliedValue,
  );
  assert.deepEqual(
    orders.price(
      charge,
      "amount",
      "A-1",
      reading.journeyId,
      read.status.dataBag,
    ),
    { kind: "fromDataBag" } satisfies FromDataBag,
  );
})();
