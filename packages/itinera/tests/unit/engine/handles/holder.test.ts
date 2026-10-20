import { describe, expect, it } from "vitest";
import type { PolicyName } from "../../../../src/policy.js";
import type { ProviderName } from "../../../../src/service.js";
import { Attempt, type StepName } from "../../../../src/step.js";
import { blamed, described, type Holder, setter } from "../../../../src/engine/handles/holder.js";

const step = "charge" as StepName;
const policy = "audit" as PolicyName;
const provider = "payments" as ProviderName;

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
const ofProvider: Holder = {
  kind: "provider",
  provider,
  step,
  attempt: Attempt.first,
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
    [
      "a service provider",
      ofProvider,
      "service provider payments, for attempt 1 of step charge",
    ],
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
    [
      "a service provider",
      ofProvider,
      { step, source: { kind: "provider", provider } },
    ],
  ])(
    "names the step and the hook or the provider of %s, when there are",
    (_, holder, who) => {
      expect(blamed(holder)).toEqual(who);
    },
  );
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
    ["a service provider", ofProvider, { kind: "provider", provider }],
  ])("names %s as having set global metadata", (_, holder, who) => {
    expect(setter(holder)).toEqual(who);
  });
});
