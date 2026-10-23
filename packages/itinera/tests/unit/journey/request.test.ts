import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import type { JourneyId } from "../../../src/journey.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import { Workflow } from "../../../src/workflow.js";
import type { DataBag } from "../../../src/journey/data-bag.js";
import { dataBag, journeyId } from "../../../src/journey/request.js";

describe("journeyId", () => {
  it("records a request for the journey ID", () => {
    class Notify extends WorkflowPolicy {
      paid(@journeyId() id: JourneyId): JourneyId {
        return id;
      }
    }
    expect(requestsOf(Notify, "paid")).toEqual([{ kind: "journeyId" }]);
  });
});

describe("dataBag", () => {
  it("records a request for the data bag", () => {
    class Orders extends Workflow {
      price(@dataBag() bag: DataBag): DataBag {
        return bag;
      }
    }
    expect(requestsOf(Orders, "price")).toEqual([{ kind: "dataBag" }]);
  });
});
