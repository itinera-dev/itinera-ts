import { describe, expect, it } from "vitest";
import { requestsOf } from "../../../src/declaration.js";
import type { JourneyId } from "../../../src/journey.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import { journeyId } from "../../../src/journey/request.js";

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
