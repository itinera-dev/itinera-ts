import { describe, it } from "vitest";
import type { JourneyAbort } from "./abort.js";

declare function aborting(abort: JourneyAbort): void;
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
});
