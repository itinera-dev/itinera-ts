import { describe, it } from "vitest";
import type { AbortReason, FailureCause, JourneyId } from "./journey.js";

declare function identifying(journeyId: JourneyId): void;
declare function aborting(reason: AbortReason): void;
declare function failing(cause: FailureCause): void;

describe("JourneyId", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a journey ID
    identifying("journey-1");
  });
});

describe("AbortReason", () => {
  it("is only one of its values", () => {
    aborting("reporter failed");
    // @ts-expect-error not a value of the set
    aborting("reporter crashed");
  });
});

describe("FailureCause", () => {
  it("is only one of its values", () => {
    failing("retries exhausted");
    // @ts-expect-error not a value of the set
    failing("retry budget exhausted");
  });
});
