import { describe, expect, it } from "vitest";
import { Ship } from "../fixtures/step.js";

describe("Step", () => {
  it("gives a step that succeeds the outcome success, which cannot be changed", () => {
    const outcome = new Ship().run();
    expect(outcome).toEqual({ kind: "success" });
    expect(Object.isFrozen(outcome)).toBe(true);
  });
});
