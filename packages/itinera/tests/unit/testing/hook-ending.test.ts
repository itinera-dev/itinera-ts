import { describe, expect, it } from "vitest";
import { HookEnding } from "../../../src/testing/hook-ending.js";

const endings = [
  ["keeping the default", HookEnding.keepDefault, { kind: "keep default" }],
  [
    "finishing the workflow",
    HookEnding.finishWorkflow,
    { kind: "finish workflow" },
  ],
  [
    "failing the workflow for a code",
    HookEnding.failWorkflow("fraud"),
    { kind: "fail workflow", reason: { code: "fraud" } },
  ],
  [
    "failing the workflow for a reason",
    HookEnding.failWorkflow({ code: "fraud", message: "card stolen" }),
    {
      kind: "fail workflow",
      reason: { code: "fraud", message: "card stolen" },
    },
  ],
  [
    "failing",
    HookEnding.fail("ledger down"),
    { kind: "fail", errorMessage: "ledger down" },
  ],
] as const;

describe("HookEnding", () => {
  it.each(endings)("makes the ending %s", (_, ending, expected) => {
    expect(ending).toEqual(expected);
  });

  it.each(endings)("freezes the ending %s", (_, ending) => {
    expect(Object.isFrozen(ending)).toBe(true);
  });
});
