import { describe, it } from "vitest";
import type { Timestamp } from "./fields.js";

declare function stamping(timestamp: Timestamp): void;

describe("Timestamp", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a timestamp
    stamping("2026-10-19T12:00:00.000Z");
  });
});
