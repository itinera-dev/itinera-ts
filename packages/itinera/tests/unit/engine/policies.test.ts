import { describe, expect, it } from "vitest";
import { Refusal } from "../../../src/executor/refusal.js";
import type { StepPolicyBuilder } from "../../../src/policy/step-policy/builder.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import type {
  StepPolicyMock,
  StepPolicyMockClass,
} from "../../../src/testing/step-policy-mock.js";
import {
  alarm,
  audit,
  callsOf,
  caught,
  charge,
  guarded,
  keptStepPolicy,
  kindOf,
  loggedCharge,
  Logging,
  logging,
  orders,
  recorded,
  run,
} from "../../fixtures/engine.js";

/** Runs the journey of `orders` with the step {@link loggedCharge} and `policies`. */
async function loggedJourney(
  log: string[],
  ...policies: readonly StepPolicyBuilder<StepPolicyMockClass>[]
): Promise<void> {
  const step = policies.reduce(
    (attached, policy) => attached.policy(policy),
    loggedCharge(log),
  );
  await run(orders(step).instance({}, { reporters: [new Logging(log)] }));
}

describe("stepPolicies", () => {
  it("builds a step's policies in the order they are attached", async () => {
    const log: string[] = [];
    await loggedJourney(
      log,
      logging(log, "audit").builder("audit").onStepSuccess("onStepSuccess"),
      logging(log, "ledger").builder("ledger").onStepRetry("onStepRetry"),
    );
    expect(log.slice(2, 4)).toEqual(["audit built", "ledger built"]);
  });

  it("aborts the journey with policy could not be built, naming the step and the policy, when one fails while it is built", async () => {
    const failing = alarm([], { buildFailure: "no ledger" }).onStepSuccess(
      "onStepSuccess",
    );
    const workflow = orders(charge().policy(failing));
    expect((await run(workflow.instance())).abort).toEqual({
      reason: "policy could not be built",
      step: "charge",
      policy: "alarm",
      errorMessage: "no ledger",
      error: new Error("no ledger"),
    });
    expect((await recorded(workflow)).events.map(kindOf)).toEqual([
      "journey_started",
      "attempt_started",
      "journey_aborted",
    ]);
  });
});

describe("workflowPolicies", () => {
  it("makes run reject with a Refusal naming the workflow policy that failed while it was built, with no event", async () => {
    const failing = audit([], { buildFailure: "no ledger" }).onWorkflowSuccess(
      "onWorkflowSuccess",
    );
    const recorder = new RecordingReporter();
    const refusal = await run(
      guarded(failing, charge()).instance({}, { reporters: [recorder] }),
    ).catch(caught);
    expect(refusal).toBeInstanceOf(Refusal);
    expect(refusal instanceof Refusal && refusal.refused).toEqual({
      kind: "workflow policy failed",
      policy: "audit",
      error: new Error("no ledger"),
      errorMessage: "no ledger",
    });
    expect(recorder.events).toEqual([]);
  });
});

describe("defining", () => {
  it("calls each hook on the policy attached to the step that defines it", async () => {
    const alarms: StepPolicyMock[] = [];
    const ledgers: StepPolicyMock[] = [];
    const ledger = keptStepPolicy(ledgers)
      .builder("ledger")
      .onStepSuccess("onStepSuccess");
    await run(
      orders(
        loggedCharge([])
          .policy(alarm(alarms).onStepRetry("onStepRetry"))
          .policy(ledger),
      ).instance(),
    );
    expect([callsOf(alarms), callsOf(ledgers)]).toEqual([
      [{ hook: "on step retry", received: [] }],
      [{ hook: "on step success", received: [] }],
    ]);
  });
});
