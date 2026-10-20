import { describe, expect, it } from "vitest";
import type { PolicyName } from "../../policy.js";
import { Attempt, type StepName } from "../../step.js";
import { blamed, described, type Holder, setter } from "./holder.js";

const step = "charge" as StepName;
const policy = "audit" as PolicyName;

const ofStep: Holder = { kind: "step", step, attempt: Attempt.first };
const ofStepHook: Holder = {
  kind: "step hook",
  policy,
  hook: "on step success",
  step,
  attempt: Attempt.first,
};
const ofWorkflowHook: Holder = {
  kind: "workflow hook",
  policy,
  hook: "on workflow success",
};

describe("described", () => {
  it.each([
    ["a step", ofStep, "attempt 1 of step charge"],
    [
      "a step hook",
      ofStepHook,
      "on step success of policy audit, for attempt 1 of step charge",
    ],
    ["a workflow hook", ofWorkflowHook, "on workflow success of policy audit"],
  ])("names %s as a message about a late handle does", (_, holder, text) => {
    expect(described(holder)).toBe(text);
  });
});

describe("blamed", () => {
  it.each([
    ["a step", ofStep, { step }],
    [
      "a step hook",
      ofStepHook,
      {
        step,
        source: { kind: "step hook", policy, hook: "on step success" },
      },
    ],
    ["a workflow hook", ofWorkflowHook, { source: ofWorkflowHook }],
  ])("names the step and the hook of %s, when there are", (_, holder, who) => {
    expect(blamed(holder)).toEqual(who);
  });
});

describe("setter", () => {
  it.each([
    ["a step", ofStep, { kind: "step" }],
    [
      "a step hook",
      ofStepHook,
      { kind: "step hook", policy, hook: "on step success" },
    ],
    ["a workflow hook", ofWorkflowHook, ofWorkflowHook],
  ])("names %s as having set global metadata", (_, holder, who) => {
    expect(setter(holder)).toEqual(who);
  });
});
