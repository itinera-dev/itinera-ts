import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import {
  type HookReporter,
  hookReporter,
} from "../../../src/policy/reporter.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";

describe("hookReporter", () => {
  it("records a request for the hook reporter", () => {
    class Notify extends WorkflowPolicy {
      async paid(@hookReporter() reporter: HookReporter): Promise<void> {
        await reporter.info("paid");
      }
    }
    expect(requestsOf(Notify, "paid")).toEqual([{ kind: "hookReporter" }]);
  });
});
