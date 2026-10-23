import { describe, expectTypeOf, it } from "vitest";
import { charging } from "../../fixtures/engine.js";
import type { WorkflowInstance } from "../../../src/instance/made.js";
import type { JourneyId } from "../../../src/journey.js";
import type { Reporter } from "../../../src/report.js";
import type { Value } from "../../../src/value.js";
import type { WorkflowDescriptor } from "../../../src/workflow.js";

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
