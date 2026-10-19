import assert from "node:assert/strict";
import {
  type Answer,
  input,
  type KeyIn,
  None,
  type Option,
  type Outcome,
  type ParameterOf,
  type Place,
  type ReadFromMetadata,
  type RequestDecorator,
  Some,
  Step,
  step,
  type StepClass,
  stepReporter,
  type StepReporter,
  type ValueRequestDecorator,
} from "itinera/unstable";
import { integer, optional, string } from "itinera/value";

@step()
class Charge extends Step {
  constructor(
    @input("amount", integer) readonly amount: number,
    @input("coupon", optional(string)) readonly coupon: Option<string>,
    @input("note") readonly note: string,
  ) {
    super();
  }

  override run(): Outcome {
    return this.succeed();
  }
}

type InConstructor = Place<StepClass, undefined>;
const amount: ParameterOf<typeof Charge, undefined, 0> = 40;
const given: Answer<typeof integer> = amount;
const coupon: Answer<ReturnType<typeof optional<typeof string>>> =
  Some("WELCOME");
const noted: ReadFromMetadata<string> = true;
const key: KeyIn<InConstructor, typeof Charge> = undefined;
const amountDecorator: ValueRequestDecorator<typeof integer, InConstructor> =
  input("amount", integer);
const reporterDecorator: RequestDecorator<
  StepReporter,
  Place<Step, "run">
> = stepReporter();

const charge = new Charge(given, None, "first order");
assert.equal(charge.coupon.unwrapOr("none"), "none");
assert.equal(coupon.unwrapOr("none"), "WELCOME");
assert.ok(noted);
assert.equal(key, undefined);
assert.equal(typeof amountDecorator, "function");
assert.equal(typeof reporterDecorator, "function");
