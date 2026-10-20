import { describe, expect, it } from "vitest";
import type { PolicyName } from "../../../src/policy.js";
import { Refusal, type Refused } from "../../../src/executor/refusal.js";

const failed = { error: new Error("disk full"), errorMessage: "disk full" };

describe("Refusal", () => {
  it.each<[string, Refused, string]>([
    [
      "an instance that ran",
      { kind: "instance ran" },
      "run refused an instance that already ran: make an instance for each journey",
    ],
    [
      "an executor running a journey",
      { kind: "journey running" },
      "run refused an instance while the executor runs a journey: wait for it, or run on another executor",
    ],
    [
      "initial data that is not a value",
      {
        kind: "initial values",
        initialData: ["order", "total"],
        initialGlobalMetadata: [],
      },
      "run refused an instance: the initial data is not a value under order, total",
    ],
    [
      "initial values of both kinds",
      {
        kind: "initial values",
        initialData: ["order"],
        initialGlobalMetadata: ["journey_id"],
      },
      "run refused an instance: the initial data is not a value under order; the initial global metadata is not a value, or is reserved, under journey_id",
    ],
    [
      "a workflow policy that failed while it was built",
      {
        kind: "workflow policy failed",
        policy: "audit" as PolicyName,
        ...failed,
      },
      "run refused an instance: workflow policy audit failed while it was built: disk full",
    ],
    [
      "a dispatcher factory that failed",
      { kind: "dispatcher factory failed", ...failed },
      "run refused an instance: the dispatcher factory failed: disk full",
    ],
    [
      "a dispatcher that failed",
      { kind: "dispatcher failed", ...failed },
      "run refused an instance: the dispatcher failed while the reporters were added: disk full",
    ],
    [
      "global metadata not set",
      { kind: "global metadata not set", ...failed },
      "run refused an instance: the global metadata could not be set: disk full",
    ],
  ])("says why it refused, for %s", (_, refused, message) => {
    expect(new Refusal(refused).message).toBe(message);
  });

  it("is an error named Refusal", () => {
    const refusal = new Refusal({ kind: "instance ran" });
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal.name).toBe("Refusal");
  });

  it("has the error of the custom code that caused it as its cause", () => {
    expect(new Refusal({ kind: "dispatcher failed", ...failed }).cause).toBe(
      failed.error,
    );
  });

  it("has no cause when no custom code caused it", () => {
    expect(new Refusal({ kind: "journey running" })).not.toHaveProperty(
      "cause",
    );
  });
});
