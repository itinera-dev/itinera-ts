import { describe, it } from "vitest";
import type { StepName } from "../../../src/step.js";
import type { AdapterName } from "../../../src/workflow.js";
import type { JourneyAbort } from "../../../src/event/abort.js";

declare function aborting(abort: JourneyAbort): void;
declare const step: StepName;
declare const adapter: AdapterName;
declare const source: Extract<
  JourneyAbort,
  { reason: "reserved metadata key" }
>["source"];

describe("JourneyAbort", () => {
  it("names only journey_id as a reserved metadata key", () => {
    aborting({ reason: "reserved metadata key", key: "journey_id", source });
    // @ts-expect-error no other key is reserved
    aborting({ reason: "reserved metadata key", key: "tenant", source });
  });

  it("names the key of the input an adapter failed for", () => {
    aborting({
      reason: "step could not be built",
      step,
      source: { kind: "adapter", adapter, key: "amount" },
    });
    aborting({
      reason: "step could not be built",
      step,
      // @ts-expect-error an adapter's failure names the input's key
      source: { kind: "adapter", adapter },
    });
  });
});
