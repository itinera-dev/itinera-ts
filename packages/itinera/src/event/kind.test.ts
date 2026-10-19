import { describe, expect, it } from "vitest";
import { EventKind } from "./kind.js";

describe("EventKind", () => {
  it.each(EventKind.values)("writes %s in snake case", (kind) => {
    expect(kind).toMatch(/^[a-z]+(_[a-z]+)+$/);
  });
});
