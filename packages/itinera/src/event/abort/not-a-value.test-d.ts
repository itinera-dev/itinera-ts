import { describe, it } from "vitest";
import type { StepName } from "../../step.js";
import type { ByProvider, ByStepHook } from "../source.js";
import type { NotAValue } from "./not-a-value.js";

declare function aborting(abort: NotAValue): void;
declare const step: StepName;
declare const provider: ByProvider;
declare const hook: ByStepHook;

describe("NotAValue", () => {
  it("names the event kind service_provided only for a provider's data", () => {
    aborting({
      reason: "not a value",
      step,
      source: provider,
      eventKind: "service_provided",
    });
    const fromHook = {
      reason: "not a value",
      step,
      source: hook,
      eventKind: "service_provided",
    } as const;
    // @ts-expect-error only a provider supplies data with an instance
    aborting(fromHook);
  });

  it("never names both a key and an event kind", () => {
    aborting({ reason: "not a value", key: "total" });
    // @ts-expect-error a value is given under a key or with an event, never both
    aborting({ reason: "not a value", key: "total", eventKind: "step_info" });
  });
});
