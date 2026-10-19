import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import type { Reporter } from "../report.js";
import { describeStep } from "../step/descriptor.js";
import { Ship } from "../step/fixtures.js";
import type { Value } from "../value.js";
import { Workflow, workflow, type WorkflowName } from "../workflow.js";
import { assemble, type Parts } from "./descriptor.js";
import type { IdGenerator } from "./registry.js";
import { Violations } from "./violation.js";

class Audit implements Reporter {
  readonly events: Event[] = [];

  report(event: Event): void {
    this.events.push(event);
  }
}

@workflow({ name: "shop" })
class Shop extends Workflow {
  readonly shop = "corner";
}

const noData = new Map<string, Value>();

const nothing: Parts = {
  name: "orders" as WorkflowName,
  steps: [],
  reporters: [],
  idGenerator: undefined,
};

function shopId(this: Workflow): string {
  return this instanceof Shop ? `${this.shop}-1` : "unknown";
}

describe("assemble", () => {
  it("refuses a workflow with no name", () => {
    expect(() => assemble({ ...nothing, name: undefined }, "Orders")).toThrow(
      "workflow Orders has no name: give it one with @workflow or with its builder's name()",
    );
  });

  it("refuses a workflow with violations", () => {
    const ship = describeStep(Ship, { name: "ship" });
    expect(() =>
      assemble({ ...nothing, steps: [ship, ship] }, "Orders"),
    ).toThrow(Violations);
  });

  it("keeps the steps it was given, though the list given changes afterwards", () => {
    const steps = [describeStep(Ship, { name: "ship" })];
    const descriptor = assemble({ ...nothing, steps }, "Orders");
    steps.pop();
    expect(descriptor.steps().map((step) => step.name)).toEqual(["ship"]);
  });

  it("builds new reporters for every journey", () => {
    const descriptor = assemble({ ...nothing, reporters: [Audit] }, "Orders");
    const [first] = descriptor.reporters();
    expect(first).toBeInstanceOf(Audit);
    expect(descriptor.reporters()[0]).not.toBe(first);
  });

  it("makes a random UUID v4 as the journey ID when it has no ID generator", () => {
    const descriptor = assemble(nothing, "Orders");
    expect(descriptor.generateJourneyId(Shop.build(), noData)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("calls its ID generator with the workflow object as this", () => {
    const descriptor = assemble({ ...nothing, idGenerator: shopId }, "Orders");
    expect(descriptor.generateJourneyId(Shop.build(), noData)).toBe("corner-1");
  });

  it("refuses a journey ID that is not a string", () => {
    const numbered = (() => 7) as unknown as IdGenerator;
    const descriptor = assemble(
      { ...nothing, idGenerator: numbered },
      "Orders",
    );
    expect(() => descriptor.generateJourneyId(Shop.build(), noData)).toThrow(
      "the ID generator of workflow orders returned number, not a string",
    );
  });
});
