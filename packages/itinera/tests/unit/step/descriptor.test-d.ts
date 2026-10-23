import { describe, expectTypeOf, it } from "vitest";
import type { Step, StepDescriptor, StepName } from "../../../src/step.js";
import { Ship } from "../../fixtures/step.js";

describe("StepDescriptor", () => {
  it("is not written by hand, as an object or as a class", () => {
    // @ts-expect-error only itinera makes a step descriptor
    const written: StepDescriptor = {
      name: "ship" as StepName,
      retryBudget: 0,
      retryOnAbnormalTermination: true,
      build: () => new Ship(),
    };
    // @ts-expect-error only itinera makes a step descriptor
    class Described implements StepDescriptor {
      readonly name = "ship" as StepName;
      readonly retryBudget = 0;
      readonly retryOnAbnormalTermination = true;

      build(): Step {
        return new Ship();
      }
    }
    expectTypeOf(written).toEqualTypeOf<StepDescriptor>();
    expectTypeOf(Described).toBeConstructibleWith();
  });
});
