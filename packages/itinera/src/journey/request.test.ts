import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import type { JourneyId } from "../journey.js";
import { WorkflowPolicy } from "../policy/workflow-policy.js";
import { journeyId } from "./request.js";

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
