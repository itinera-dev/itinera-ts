import { describe, expect, it } from "vitest";
import type { Contributor } from "../../../src/journey.js";
import { contributor } from "../../../src/journey/contributor.js";
import { string } from "../../../src/value/token.js";
import type { StepPolicy } from "../../../src/policy/step-policy.js";
import { Tally } from "../../fixtures/policy.js";
import { failureCause, fromStep } from "../../../src/policy/request.js";
import { stepPolicyGiven } from "../../../src/policy/step-policy/builder.js";

/** The step policy `tally`, whose `on step success` is `counted`. */
const tally = stepPolicyGiven(
  Tally.builder("tally").onStepSuccess(
    "counted",
    fromStep("note", string),
    contributor(),
  ),
);

/** A contributor that keeps in `kept` what it is given, in order. */
function keeping(kept: unknown[][]): Contributor {
  return {
    contribute: (key, value) => {
      kept.push([key, value]);
    },
  };
}

/** A built `tally` whose `counted` is not a method. */
function withoutMethod(): StepPolicy {
  return Object.defineProperty(new Tally(), "counted", { value: "counted" });
}

/** A built policy of the class `Tally` whose `failed` throws. */
function failing(): StepPolicy {
  const built = new Tally();
  built.failed = () => {
    throw new RangeError("no cause");
  };
  return built;
}

describe("PolicyDescriptor.call", () => {
  it("calls the method implementing the hook on the policy, with the answers in order, and gives what it returns", () => {
    const kept: unknown[][] = [];
    expect(
      tally.call(tally.build(), "on step success", ["checked", keeping(kept)]),
    ).toEqual({ kind: "KeepDefault" });
    expect(kept).toEqual([["note", "checked"]]);
  });

  it.each([
    [
      "the policy does not define the hook",
      tally.build(),
      "policy tally does not define on step failure",
      "on step failure",
    ],
    [
      "the policy has no method for it",
      withoutMethod(),
      "policy tally does not define on step success",
      "on step success",
    ],
  ] as const)("throws a TypeError when %s", (_, policy, message, hook) => {
    expect(() => tally.call(policy, hook, [])).toThrow(new TypeError(message));
  });

  it("lets through what the hook throws", () => {
    const described = stepPolicyGiven(
      Tally.builder("tally").onStepFailure("failed", failureCause()),
    );
    expect(() => described.call(failing(), "on step failure", [])).toThrow(
      RangeError,
    );
  });
});
