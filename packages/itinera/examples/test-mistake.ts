import assert from "node:assert/strict";
import { type Outcome, Step, step } from "itinera/step";
import { MistakeKind, scripted, TestMistake } from "itinera/unstable";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", retryBudget: 1 })
class Orders extends Workflow {}

export default (async () => {
  const instance = Orders.build().instance({});

  assert.throws(
    () => scripted(instance).step("chrage"),
    new TestMistake([{ kind: MistakeKind.UnknownStep, step: "chrage" }]),
  );

  await assert.rejects(
    scripted(instance).step("charge").willFail("declined").run(),
    (mistake: unknown) =>
      mistake instanceof TestMistake &&
      mistake.message ===
        "the test is mistaken: attempt 2 of charge is left out" &&
      mistake.problems[0]?.kind === MistakeKind.AttemptLeftOut,
  );
})();
