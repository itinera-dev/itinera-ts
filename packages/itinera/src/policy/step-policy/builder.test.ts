import { describe, expect, it } from "vitest";
import { contributor } from "../../journey/contributor.js";
import { string } from "../../value/token.js";
import { hookOf, kindOf } from "../descriptor.js";
import { Audit, Tally } from "../fixtures.js";
import { failureCause, fromStep } from "../request.js";
import { stepPolicyGiven } from "./builder.js";

describe("a step policy's builder", () => {
  it("describes the hooks it is given, with their methods and requests", () => {
    const described = stepPolicyGiven(
      Tally.builder("tally")
        .onStepSuccess("counted", fromStep("note", string), contributor())
        .onStepFailure("failed", failureCause()),
    );
    expect(described.name).toBe("tally");
    expect(kindOf(described)).toBe("step");
    expect(described.hooks()).toEqual(["on step success", "on step failure"]);
    expect(hookOf(described, "on step success")).toEqual({
      key: "counted",
      requests: [
        {
          kind: "fromStep",
          key: "note",
          type: { schema: string, optional: false },
        },
        { kind: "contributor" },
      ],
    });
    expect(described.build()).toBeInstanceOf(Tally);
  });

  it("refuses a policy given no hook, when it is attached", () => {
    expect(() => stepPolicyGiven(Tally.builder("tally"))).toThrow(
      "policy tally defines no hook",
    );
  });
});

describe("a step policy given as a class", () => {
  it("is the descriptor its decorator made", () => {
    expect(stepPolicyGiven(Audit).name).toBe("audit");
  });

  it("is refused when it is not declared with @stepPolicy", () => {
    expect(() => stepPolicyGiven(Tally)).toThrow(
      "Tally is not declared with @stepPolicy",
    );
  });
});
