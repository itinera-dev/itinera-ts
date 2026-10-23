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
});
