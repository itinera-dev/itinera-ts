import { describe, expect, it } from "vitest";
import { contributor } from "../../../src/journey/contributor.js";
import { string } from "../../../src/value/token.js";
import { Audit, Tally } from "../../fixtures/policy.js";
import { failureCause, fromStep } from "../../../src/policy/request.js";
import type { StepPolicyBuilder } from "../../../src/policy/step-policy/builder.js";
import { stepPolicyGiven } from "../../../src/policy/step-policy/builder.js";

/** A step policy's builder whose hooks take anything, as a cast lets through. */
function loosely(builder: StepPolicyBuilder<typeof Tally> = Tally.builder()): {
  onStepSuccess(key: string, ...requests: unknown[]): unknown;
  onStepRetry(key: string, ...requests: unknown[]): unknown;
} {
  return builder as unknown as {
    onStepSuccess(key: string, ...requests: unknown[]): unknown;
    onStepRetry(key: string, ...requests: unknown[]): unknown;
  };
}

describe("a policy's builder", () => {
  it("names the policy after its class when no name is given", () => {
    expect(
      stepPolicyGiven(Tally.builder().onStepFailure("failed", failureCause()))
        .name,
    ).toBe("Tally");
  });

  it("refuses at once an empty name", () => {
    expect(() => Tally.builder("")).toThrow(
      "policy class Tally has an empty name",
    );
  });

  it("refuses at once a class declared with a policy's decorator", () => {
    expect(() => Audit.builder()).toThrow(
      "Audit is declared with @stepPolicy: give the class itself",
    );
  });

  it("refuses at once a hook defined twice", () => {
    expect(() =>
      Tally.builder()
        .onStepSuccess("counted", fromStep("note", string), contributor())
        .onStepSuccess("counted", fromStep("note", string), contributor()),
    ).toThrow("Tally defines on step success twice, on counted and on counted");
  });

  it("refuses at once a method given two hooks", () => {
    const builder = Tally.builder().onStepFailure("failed", failureCause());
    expect(() => {
      loosely(builder).onStepRetry("failed", failureCause());
    }).toThrow("Tally.failed is given two hooks");
  });

  it("refuses at once a cause the hook is not given", () => {
    expect(() => {
      loosely().onStepRetry("failed", failureCause());
    }).toThrow(
      "Tally.failed requests the failure cause, which only on step failure is given",
    );
  });

  it("refuses at once what is not a method", () => {
    expect(() => {
      loosely().onStepSuccess("field");
    }).toThrow("Tally.field is not a method of the class");
  });

  it("refuses at once a parameter left without a request", () => {
    expect(() => {
      loosely().onStepSuccess("counted", contributor());
    }).toThrow("Tally.counted: parameter 2 carries no request");
  });
});
