import { describe, expect, it } from "vitest";
import type { HookSource, StepHookSource } from "../../../../src/event.js";
import { type PolicyName, StepHook } from "../../../../src/policy.js";
import {
  failingWorkflow,
  finished,
  keptDefault,
} from "../../../../src/policy/lifecycle.js";
import { DefaultDispatcher } from "../../../../src/report/default-dispatcher.js";
import { Attempt, type StepName } from "../../../../src/step.js";
import { journeyThrough, Payment } from "../../../fixtures/engine.js";
import { JourneyAbortError } from "../../../../src/engine/signal.js";
import { lifecycleOf } from "../../../../src/engine/hook/lifecycle.js";

/** The hook `hook` of the step policy `alarm`, for the first attempt of `charge`. */
function stepHook(hook: StepHook): StepHookSource {
  return {
    kind: "step hook",
    policy: "alarm" as PolicyName,
    hook,
    step: "charge" as StepName,
    attempt: Attempt.first,
  };
}

const onStepFailure = stepHook(StepHook.OnStepFailure);

const onWorkflowSuccess: HookSource = {
  kind: "workflow hook",
  policy: "audit" as PolicyName,
  hook: "on workflow success",
};

/** What `hook` returning `returned` gives: its lifecycle, or the abort it causes. */
function checked(hook: HookSource, returned: unknown): unknown {
  try {
    return lifecycleOf(journeyThrough(new DefaultDispatcher()), hook, returned);
  } catch (thrown) {
    return thrown instanceof JourneyAbortError ? thrown.abort : thrown;
  }
}

function isNotOnStepSuccess(hook: StepHook): boolean {
  return hook !== StepHook.OnStepSuccess;
}

function throwing(): never {
  throw new Error("no kind");
}

const invalid = { reason: "invalid lifecycle", step: "charge" };

describe("lifecycleOf", () => {
  it.each<[string, HookSource, unknown]>([
    ["a step hook that returned nothing", onStepFailure, undefined],
    ["a workflow hook that returned nothing", onWorkflowSuccess, undefined],
    ["a step hook that kept the default", onStepFailure, keptDefault],
    [
      "a step hook that kept the default with an object of its own",
      onStepFailure,
      { kind: "KeepDefault" },
    ],
  ])("gives no lifecycle for %s", (_, hook, returned) => {
    expect(checked(hook, returned)).toBeUndefined();
  });

  it("gives FinishWorkflow from on step success", () => {
    expect(
      checked(stepHook(StepHook.OnStepSuccess), { kind: "FinishWorkflow" }),
    ).toBe(finished);
  });

  it("gives FailWorkflow from every step hook, frozen, with its reason's details captured", () => {
    for (const hook of StepHook.values) {
      const failing = checked(stepHook(hook), {
        kind: "FailWorkflow",
        reason: {
          code: "fraud",
          message: "card stolen",
          details: new Payment(500),
        },
      });
      expect(failing).toEqual({
        kind: "FailWorkflow",
        reason: { code: "fraud", message: "card stolen", details: 500 },
      });
      expect(Object.isFrozen(failing)).toBe(true);
    }
  });

  it.each([
    [
      "an object of its own",
      { kind: "FailWorkflow", reason: { code: "fraud", details: Number.NaN } },
    ],
    [
      "what failWorkflow made",
      failingWorkflow({ code: "fraud", details: Number.NaN }),
    ],
  ])(
    "aborts the journey with not a value when the details of FailWorkflow's reason are not a value, in %s",
    (_, returned) => {
      expect(checked(onStepFailure, returned)).toEqual({
        reason: "not a value",
        step: "charge",
        source: {
          kind: "step hook",
          policy: "alarm",
          hook: "on step failure",
        },
      });
    },
  );

  it("aborts the journey with invalid lifecycle for FinishWorkflow from every step hook but on step success", () => {
    for (const hook of StepHook.values.filter(isNotOnStepSuccess)) {
      expect(checked(stepHook(hook), finished)).toEqual(invalid);
    }
  });

  it.each<[string, unknown]>([
    ["text", "KeepDefault"],
    ["null", null],
    ["a number", 0],
    ["a lifecycle of no known kind", { kind: "RetryLater" }],
    ["FailWorkflow with no reason", { kind: "FailWorkflow" }],
    [
      "FailWorkflow with a code that is not text",
      { kind: "FailWorkflow", reason: { code: 7 } },
    ],
    [
      "FailWorkflow with a message that is not text",
      { kind: "FailWorkflow", reason: { code: "fraud", message: 7 } },
    ],
    [
      "an object whose kind throws when read",
      Object.defineProperty({}, "kind", { get: throwing }),
    ],
    [
      "FailWorkflow whose reason throws when read",
      Object.defineProperty({ kind: "FailWorkflow" }, "reason", {
        get: throwing,
      }),
    ],
  ])(
    "aborts the journey with invalid lifecycle when a step hook returns %s",
    (_, returned) => {
      expect(checked(onStepFailure, returned)).toEqual(invalid);
    },
  );

  it.each<[string, unknown]>([
    ["KeepDefault", keptDefault],
    ["FinishWorkflow", finished],
    ["FailWorkflow", failingWorkflow("fraud")],
  ])(
    "aborts the journey with invalid lifecycle, naming no step, when a workflow hook returns %s",
    (_, returned) => {
      expect(checked(onWorkflowSuccess, returned)).toEqual({
        reason: "invalid lifecycle",
      });
    },
  );
});
