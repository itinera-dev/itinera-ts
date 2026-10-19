import { describe, expect, it } from "vitest";
import { ModelError } from "./error.js";
import { eventKind } from "./report.js";

describe("event kinds", () => {
  it("reads only the kinds of the catalogue", () => {
    expect(eventKind("step_retrying")).toBe("step_retrying");
    expect(() => eventKind("step_started")).toThrow(
      new ModelError('"step_started" is not an event of the catalogue'),
    );
  });
});
