import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import { type HookReporter, hookReporter } from "./reporter.js";
import { WorkflowPolicy } from "./workflow-policy.js";

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
