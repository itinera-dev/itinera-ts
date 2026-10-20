import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import { type Contributor, contributor } from "../journey.js";
import { type HookReporter, hookReporter, type OnSuccess } from "../policy.js";
import { StepPolicy } from "../policy/step-policy.js";
import { Ending } from "../testing/ending.js";
import { type FailureHookEnding, HookEnding } from "../testing/hook-ending.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { stepMock } from "../testing/step-mock.js";
import { stepPolicyMock } from "../testing/step-policy-mock.js";
import type { Built } from "../workflow.js";
import {
  alarm,
  audit,
  charge,
  guarded,
  noon,
  type Orders,
  orders,
  recorded,
  run,
  kindOf,
  failingOn,
} from "./fixtures.js";

const declining = stepMock({ attempts: [Ending.failure("declined")] });

function isHookCalled(event: Event): boolean {
  return event.kind === "hook_called";
}

/** A step policy whose `on step success` contributes `audit` and keeps the default. */
class Ledger extends StepPolicy {
  noted(contributing: Contributor): OnSuccess {
    contributing.contribute("audit", "checked");
    return this.keepDefault();
  }
}

/**
 * A step policy whose `on step success` emits `journey_info`, ignoring how
 * it fails, and keeps the default.
 */
class Careless extends StepPolicy {
  async noted(reporter: HookReporter): Promise<OnSuccess> {
    await reporter.info("checked").catch(String);
    return this.keepDefault();
  }
}

/** The step `charge`, whose step policy `alarm` defines `on step failure`. */
function alarmed(onStepFailure: FailureHookEnding): Built<Orders> {
  const policy = alarm([], { onStepFailure }).onStepFailure("onStepFailure");
  return orders(declining.builder("charge").policy(policy));
}

describe("hookCalled", () => {
  it.each([
    ["with no lifecycle when it keeps the default", HookEnding.keepDefault, {}],
    [
      "with the lifecycle it returned",
      HookEnding.failWorkflow("fraud"),
      { lifecycle: { kind: "FailWorkflow", reason: { code: "fraud" } } },
    ],
  ])(
    "reports a step hook that returned with hook_called, naming the policy, the hook, the step and the attempt, %s",
    async (_, ending, carried) => {
      const recorder = new RecordingReporter();
      const instance = alarmed(ending).instance({}, { reporters: [recorder] });
      await run(instance);
      expect(recorder.events.filter(isHookCalled)).toEqual([
        {
          kind: "hook_called",
          sequence: 5,
          timestamp: noon,
          journeyId: instance.journeyId,
          workflow: "orders",
          source: {
            kind: "step hook",
            policy: "alarm",
            hook: "on step failure",
            step: "charge",
            attempt: { number: 1 },
          },
          ...carried,
        },
      ]);
    },
  );

  it("reports a workflow hook that returned with hook_called, naming only the policy and the hook", async () => {
    const policy = audit().onWorkflowSuccess("onWorkflowSuccess");
    const { events } = await recorded(guarded(policy, charge()));
    const called = events.find(isHookCalled);
    expect(called).toMatchObject({
      kind: "hook_called",
      source: {
        kind: "workflow hook",
        policy: "audit",
        hook: "on workflow success",
      },
    });
    expect(called).not.toHaveProperty("lifecycle");
  });

  it("commits what a hook contributed once hook_called is reported, with the hook as its source", async () => {
    const ledger = Ledger.builder("ledger").onStepSuccess(
      "noted",
      contributor(),
    );
    const workflow = orders(charge().policy(ledger));
    const { events } = await recorded(workflow);
    expect(events.slice(2, 5)).toMatchObject([
      { kind: "step_succeeded" },
      { kind: "hook_called" },
      {
        kind: "contribution_committed",
        key: "audit",
        source: { kind: "step hook", policy: "ledger", step: "charge" },
      },
    ]);
    const result = await run(workflow.instance());
    expect(result.isSucceeded() && result.status.dataBag.keys()).toEqual([
      "audit",
    ]);
  });

  it.each<[string, Built<Orders>, object]>([
    [
      "a step hook, naming its step",
      orders(
        charge().policy(
          alarm([], {
            onStepSuccess: HookEnding.fail("ledger down"),
          }).onStepSuccess("onStepSuccess"),
        ),
      ),
      { step: "charge" },
    ],
    [
      "a workflow hook, naming no step",
      guarded(
        audit([], {
          onWorkflowSuccess: HookEnding.fail("ledger down"),
        }).onWorkflowSuccess("onWorkflowSuccess"),
        charge(),
      ),
      {},
    ],
  ])(
    "aborts the journey with hook failed, carrying the error, when %s throws",
    async (_, workflow, named) => {
      const recorder = new RecordingReporter();
      const result = await run(
        workflow.instance({}, { reporters: [recorder] }),
      );
      expect(result.abort).toEqual({
        reason: "hook failed",
        ...named,
        errorMessage: "ledger down",
        error: new Error("ledger down"),
      });
      expect(recorder.events.filter(isHookCalled)).toEqual([]);
    },
  );

  it("aborts the journey with hook failed when an asynchronous hook rejects", async () => {
    class Slow extends stepPolicyMock({
      onStepSuccess: HookEnding.fail("ledger down"),
    }) {
      override async onStepSuccess(): Promise<OnSuccess> {
        await Promise.resolve();
        return super.onStepSuccess();
      }
    }
    const slow = Slow.builder("slow").onStepSuccess("onStepSuccess");
    const result = await run(orders(charge().policy(slow)).instance());
    expect(result.abort).toMatchObject({
      reason: "hook failed",
      errorMessage: "ledger down",
    });
  });

  it("keeps the abort recorded while a hook ran, whatever the hook did afterwards", async () => {
    const careless = Careless.builder("careless").onStepSuccess(
      "noted",
      hookReporter(),
    );
    const recorder = new RecordingReporter();
    const result = await run(
      orders(charge().policy(careless)).instance(
        {},
        {
          reporters: [recorder, failingOn("journey_info", "disk full")],
        },
      ),
    );
    expect(result.abort).toMatchObject({
      reason: "reporter failed",
      step: "charge",
      errorMessage: "disk full",
    });
    expect(recorder.events.slice(3).map(kindOf)).toEqual([
      "journey_info",
      "journey_aborted",
    ]);
  });
});
