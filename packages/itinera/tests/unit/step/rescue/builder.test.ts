import { describe, expect, it } from "vitest";
import { integer } from "../../../../src/value/token.js";
import { describedBy } from "../../../../src/step/builder.js";
import { rescueOf } from "../../../../src/step/descriptor.js";
import { Ship } from "../../../fixtures/step.js";
import { type RescueOutcome, RescueStep } from "../../../../src/step/rescue.js";
import { input } from "../../../../src/step/request.js";

class Weigh extends RescueStep {
  constructor(readonly grams: number) {
    super();
  }

  override run(): RescueOutcome {
    return this.succeed();
  }
}

describe("a rescue step's builder", () => {
  it("gives the rescue step its requests by position", () => {
    const rescue = Weigh.builder().needs(input("grams", integer));
    expect(
      rescueOf(describedBy(Ship.builder("ship").rescue(rescue)))?.requests,
    ).toEqual({
      needs: [
        {
          kind: "input",
          key: "grams",
          type: { schema: integer, optional: false },
        },
      ],
      run: [],
    });
  });

  it("is needed for a rescue step class not declared with @rescueStep, which a step refuses at once without it", () => {
    expect(() => Ship.builder("ship").rescue(Weigh)).toThrow(
      "Weigh is not declared with @rescueStep",
    );
  });

  it("leaves no parameter without a request, or a step refuses it at once", () => {
    expect(() => Ship.builder("ship").rescue(Weigh.builder())).toThrow(
      "the constructor of Weigh: parameter 1 carries no request",
    );
  });
});
