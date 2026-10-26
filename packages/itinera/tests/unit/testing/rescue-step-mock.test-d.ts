import { describe, it } from "vitest";
import { Ending } from "../../../src/testing/ending.js";
import { rescueStepMock } from "../../../src/testing/rescue-step-mock.js";

describe("rescueStepMock", () => {
  it("takes no ending that skips", () => {
    rescueStepMock({
      // @ts-expect-error a rescue step cannot skip
      attempts: [Ending.skip],
    });
  });

  it("refuses static data on a class extending it", () => {
    class Recount extends rescueStepMock({ attempts: [Ending.success] }) {
      static rescues = 0;
    }
    // @ts-expect-error a rescue step keeps no static data
    Recount.builder();
  });
});
