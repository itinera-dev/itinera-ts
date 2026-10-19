import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import type { RetryCause, StepFailureCause } from "../policy.js";
import { integer, number, optional } from "../value/token.js";
import type { Option } from "../option.js";
import type { Messages } from "./fixtures.js";
import { failureCause, fromStep, retryCause, role } from "./request.js";
import { StepPolicy } from "./step-policy.js";

class Audit extends StepPolicy<Messages> {
  audited(
    @fromStep("charged", integer) charged: number,
    @fromStep("coupon", optional(integer)) coupon: Option<number>,
    @fromStep("rate") rate: number,
    @role<Messages>() messages: Messages,
  ): void {
    messages.tell(
      `${String(charged)} ${String(coupon.isSome())} ${String(rate)}`,
    );
  }

  failed(@failureCause() cause: StepFailureCause): StepFailureCause {
    return cause;
  }

  retried(@retryCause() cause: RetryCause): RetryCause {
    return cause;
  }
}

describe("fromStep", () => {
  it.each([
    ["a type written", 0, "charged", integer, false],
    ["a type that optional wraps", 1, "coupon", integer, true],
    ["a type read from the metadata", 2, "rate", number, false],
  ])("records the key and %s", (_, index, key, schema, optional) => {
    expect(requestsOf(Audit, "audited")[index]).toEqual({
      kind: "fromStep",
      key,
      type: { schema, optional },
    });
  });
});

describe("role", () => {
  it("records a request for a role", () => {
    expect(requestsOf(Audit, "audited")[3]).toEqual({ kind: "role" });
  });
});

describe("failureCause and retryCause", () => {
  it.each([
    ["the failure cause", "failed", "failureCause"],
    ["the retry cause", "retried", "retryCause"],
  ])("record a request for %s", (_, method, kind) => {
    expect(requestsOf(Audit, method)).toEqual([{ kind }]);
  });
});
