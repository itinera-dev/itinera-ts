import { describe, expect, it } from "vitest";
import { orders } from "../../engine/fixtures.js";
import { integer } from "../../value/token.js";
import { Level } from "../emitted.js";
import { RecordingReporter } from "../recording-reporter.js";
import { scripted } from "../scripted.js";
import { charge } from "./fixtures.js";

function recorded() {
  const recorder = new RecordingReporter();
  const instance = orders(charge().retryBudget(1)).instance(
    {},
    { reporters: [recorder] },
  );
  return { recorder, script: scripted(instance) };
}

function kindOf(event: { readonly kind: string }): string {
  return event.kind;
}

describe("playing", () => {
  it("plays an attempt's actions in the order written, through the attempt's handles, then its ending", async () => {
    const { recorder, script } = recorded();
    const run = await script
      .step("charge")
      .willContribute("charged", 40)
      .willEmit(Level.Warning, "charged late", { minutes: 5 })
      .willSetGlobalMetadata("gateway", "main")
      .willSucceed()
      .run();
    expect(recorder.events.map(kindOf)).toEqual([
      "journey_started",
      "attempt_started",
      "step_warning",
      "global_metadata_set",
      "step_succeeded",
      "contribution_committed",
      "journey_succeeded",
    ]);
    expect(recorder.events[2]).toMatchObject({
      message: "charged late",
      data: { minutes: 5 },
    });
    expect(recorder.globalMetadata.get("gateway")).toBe("main");
    expect(run.result.output({ charged: integer })).toEqual({ charged: 40 });
  });

  it("discards the contributions of an attempt that does not succeed", async () => {
    const { recorder, script } = recorded();
    await script
      .step("charge")
      .onEveryAttempt()
      .willContribute("charged", 40)
      .willFail("declined")
      .run();
    expect(recorder.events.map(kindOf)).not.toContain("contribution_committed");
  });

  it("ends a scripted attempt with its ending, a skip carrying its reason", async () => {
    const { recorder, script } = recorded();
    await script.step("charge").willSkipBecause("paid already").run();
    expect(recorder.path).toEqual([
      "charge attempt 1 skipped: paid already",
      "journey succeeded",
    ]);
  });
});
