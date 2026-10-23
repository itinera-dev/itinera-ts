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
  constructor(@input("amount", integer) readonly amount: number) {
    super();
  }

  override run(): Outcome {
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
    return price === undefined || bag.keys().includes(key)
      ? this.fromDataBag()
      : this.supply(price);
  }
}

export default (async () => {
  const orders = Orders.build(new Map([["A-1", 40]]));
  const instance = orders.instance(new Map([["order", "A-1"]]));
  const result = await new LocalExecutor().run(instance);
  assert.ok(result.isSucceeded());
  const bag = result.status.dataBag;

  const supplied = orders.price(
    "charge" as StepName,
    "amount",
    "A-1",
    instance.journeyId,
    bag,
  );
  const read = orders.price(
    "charge" as StepName,
    "amount",
    "B-2",
    instance.journeyId,
    bag,
  );

  assert.deepEqual(supplied, {
    kind: "supplied",
    value: 40,
  } satisfies SuppliedValue);
  assert.deepEqual(read, { kind: "fromDataBag" } satisfies FromDataBag);
  assert.deepEqual(orders.asked, [
    `${instance.journeyId}: charge amount`,
    `${instance.journeyId}: charge amount`,
  ]);
})();
