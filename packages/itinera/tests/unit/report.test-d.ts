import { describe, expectTypeOf, it } from "vitest";
import type { Event } from "../../src/event.js";
import type { Reporter } from "../../src/report.js";

describe("Reporter", () => {
  it("need not take global metadata", () => {
    expectTypeOf<{ report(event: Event): void }>().toExtend<Reporter>();
  });

  it("may report asynchronously", () => {
    expectTypeOf<{
      report(event: Event): Promise<void>;
    }>().toExtend<Reporter>();
  });
});
