import { describe, it } from "vitest";
import { Ending } from "./ending.js";
import { rescueStepMock } from "./rescue-step-mock.js";

describe("rescueStepMock", () => {
  it("takes no ending that skips", () => {
    rescueStepMock({
      // @ts-expect-error a rescue step cannot skip
      attempts: [Ending.skip],
    });
  });
});
