import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import type { Option } from "../option.js";
import { WorkflowPolicy } from "../policy/workflow-policy.js";
import { integer, optional, string } from "../value/token.js";
import { fromWorkflow } from "./request.js";

class Notify extends WorkflowPolicy {
  paid(
    @fromWorkflow("charged", integer) charged: number,
    @fromWorkflow("coupon", optional(integer)) coupon: Option<number>,
    @fromWorkflow("payment") payment: string,
  ): string {
    return `${String(charged)} ${String(coupon.isSome())} ${payment}`;
  }
}

describe("fromWorkflow", () => {
  it.each([
    ["a type written", 0, "charged", integer, false],
    ["a type optional wraps", 1, "coupon", integer, true],
    ["a type read from the metadata", 2, "payment", string, false],
  ])("records the key and %s", (_, index, key, schema, optional) => {
    expect(requestsOf(Notify, "paid")[index]).toEqual({
      kind: "fromWorkflow",
      key,
      type: { schema, optional },
    });
  });
});
