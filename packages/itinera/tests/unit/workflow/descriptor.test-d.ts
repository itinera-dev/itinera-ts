import { describe, expectTypeOf, it } from "vitest";
import type { JourneyId } from "../../../src/journey.js";
import type { Reporter } from "../../../src/report.js";
import type { StepDescriptor } from "../../../src/step.js";
import type {
  WorkflowDescriptor,
  WorkflowName,
} from "../../../src/workflow.js";

describe("WorkflowDescriptor", () => {
  it("is not written by hand, as an object or as a class", () => {
    // @ts-expect-error only itinera makes a workflow descriptor
    const written: WorkflowDescriptor = {
      name: "orders" as WorkflowName,
      steps: () => [],
      reporters: () => [],
      generateJourneyId: () => "order-1" as JourneyId,
    };
    // @ts-expect-error only itinera makes a workflow descriptor
    class Described implements WorkflowDescriptor {
      readonly name = "orders" as WorkflowName;

      steps(): readonly StepDescriptor[] {
        return [];
      }

      reporters(): readonly Reporter[] {
        return [];
      }

      generateJourneyId(): JourneyId {
        return "order-1" as JourneyId;
      }
    }
    expectTypeOf(written).toEqualTypeOf<WorkflowDescriptor>();
    expectTypeOf(Described).toBeConstructibleWith();
  });
});
