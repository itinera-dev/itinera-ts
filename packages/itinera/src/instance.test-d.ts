import { describe, expectTypeOf, it } from "vitest";
import { charging } from "./engine/fixtures.js";
import type { WorkflowInstance } from "./instance.js";
import type { JourneyId } from "./journey.js";
import type { Reporter } from "./report.js";
import type { Value } from "./value.js";
import type { WorkflowDescriptor } from "./workflow.js";

describe("WorkflowInstance", () => {
  it("is not written by hand, as an object or as a class", () => {
    const made = charging();
    // @ts-expect-error only instance() makes a workflow instance
    const written: WorkflowInstance = {
      descriptor: made.descriptor,
      workflow: made.workflow,
      initialData: made.initialData,
      journeyId: made.journeyId,
      takeReporters: () => [],
      takeGlobalMetadata: () => new Map(),
    };
    // @ts-expect-error only instance() makes a workflow instance
    class Written implements WorkflowInstance {
      readonly descriptor: WorkflowDescriptor = made.descriptor;
      readonly workflow = made.workflow;
      readonly initialData: ReadonlyMap<string, Value> = new Map();
      readonly journeyId: JourneyId = made.journeyId;

      takeReporters(): readonly Reporter[] {
        return [];
      }

      takeGlobalMetadata(): ReadonlyMap<string, Value> {
        return new Map();
      }
    }
    expectTypeOf(written).toEqualTypeOf<WorkflowInstance>();
    expectTypeOf(Written).toBeConstructibleWith();
  });
});
