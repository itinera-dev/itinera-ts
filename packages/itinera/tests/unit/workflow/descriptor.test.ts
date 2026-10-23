import { describe, expect, it } from "vitest";
import type { Event } from "../../../src/event.js";
import type { DataBag } from "../../../src/journey.js";
import type { Value } from "../../../src/value.js";
import type { Reporter } from "../../../src/report.js";
import { describeStep } from "../../../src/step/descriptor.js";
import { Ship } from "../../fixtures/step.js";
import {
  Workflow,
  workflow,
  type WorkflowName,
} from "../../../src/workflow.js";
import type { StepName } from "../../../src/step.js";
import type { DeclaredAdapter } from "../../../src/workflow/adapter.js";
import {
  assemble,
  type Parts,
} from "../../../src/workflow/descriptor/assemble.js";
import { adapter, provider } from "../../fixtures/workflow.js";
import type { DeclaredIdGenerator } from "../../../src/workflow/id-generator.js";

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

const nothing: Parts = {
  name: "orders" as WorkflowName,
  steps: [],
  reporters: [],
  policies: [],
  adapters: [],
  providers: [],
  idGenerator: undefined,
};

function shopId(this: Workflow): string {
  return this instanceof Shop ? `${this.shop}-1` : "unknown";
}

const kept: DataBag[] = [];

function keepingData(...given: DataBag[]): string {
  kept.push(...given);
  return given.map(keysOf).join(" and ");
}

function keysOf(data: DataBag): string {
  return data.keys().join(",");
}

function generator(
  method: DeclaredIdGenerator["method"],
  requests: DeclaredIdGenerator["requests"] = [],
): DeclaredIdGenerator {
  return { key: "orderId", method, requests };
}

const noData = new Map<string, Value>();

describe("WorkflowDescriptor", () => {
  it("keeps the steps it was given, though the list given changes afterwards", () => {
    const steps = [shipping()];
    const descriptor = assemble({ ...nothing, steps }, "Orders");
    steps.pop();
    expect(descriptor.steps().map((step) => step.name)).toEqual(["ship"]);
  });

  it("cannot be changed", () => {
    expect(Object.isFrozen(assemble(nothing, "Orders"))).toBe(true);
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
    const descriptor = assemble(
      { ...nothing, idGenerator: generator(shopId) },
      "Orders",
    );
    expect(descriptor.generateJourneyId(Shop.build(), noData)).toBe("corner-1");
  });

  it("gives its ID generator a data bag of the initial data for each request, without what is not a value", () => {
    const descriptor = assemble(
      {
        ...nothing,
        idGenerator: generator(keepingData, [
          { kind: "dataBag" },
          { kind: "dataBag" },
        ]),
      },
      "Orders",
    );
    const data = new Map<string, Value>([
      ["number", 7],
      ["total", Number.NaN],
      ["shop", "corner"],
    ]);
    expect(descriptor.generateJourneyId(Shop.build(), data)).toBe(
      "number,shop and number,shop",
    );
  });

  it("empties the data bag it gave its ID generator once the ID is made", () => {
    const descriptor = assemble(
      {
        ...nothing,
        idGenerator: generator(keepingData, [{ kind: "dataBag" }]),
      },
      "Orders",
    );
    descriptor.generateJourneyId(Shop.build(), new Map([["number", 7]]));
    expect(kept.at(-1)?.keys()).toEqual([]);
  });

  it("refuses a journey ID that is not a string", () => {
    const descriptor = assemble(
      { ...nothing, idGenerator: generator(() => 7) },
      "Orders",
    );
    expect(() => descriptor.generateJourneyId(Shop.build(), noData)).toThrow(
      "the ID generator of workflow orders returned number, not a string",
    );
  });

  it("asks the input adapter attached to a step, with the workflow object as this and the answers in order", () => {
    const pricing: DeclaredAdapter = {
      ...adapter("pricing", "ship"),
      method: shopAndAnswers,
    };
    const descriptor = assemble(
      { ...nothing, steps: [shipping()], adapters: [pricing] },
      "Orders",
    );
    expect(
      descriptor.adapt(Shop.build(), "ship" as StepName, ["amount", 42]),
    ).toEqual(["corner", "amount", 42]);
  });

  it("refuses to adapt a step no input adapter is attached to", () => {
    const descriptor = assemble(
      {
        ...nothing,
        steps: [shipping()],
        adapters: [adapter("pricing", "ship")],
      },
      "Orders",
    );
    expect(() =>
      descriptor.adapt(Shop.build(), "charge" as StepName, []),
    ).toThrow(
      new TypeError(
        "no input adapter of workflow orders is attached to step charge",
      ),
    );
  });

  it("asks the service provider serving a step for a service, with the workflow object as this and the answers in order", () => {
    const till = { ...provider("till"), method: shopAndAnswers };
    const descriptor = assemble(
      { ...nothing, steps: [shipping()], providers: [till] },
      "Orders",
    );
    expect(
      descriptor.provide(Shop.build(), "ship" as StepName, "payments", [7]),
    ).toEqual(["corner", 7]);
  });

  it("refuses to provide a service no provider serves the step under", () => {
    const descriptor = assemble(
      { ...nothing, steps: [shipping()], providers: [provider("till")] },
      "Orders",
    );
    expect(() =>
      descriptor.provide(Shop.build(), "ship" as StepName, "stock", []),
    ).toThrow(
      new TypeError(
        "no service provider of workflow orders serves step ship under the key stock",
      ),
    );
  });
});

function shipping() {
  return describeStep(Ship, { name: "ship" });
}

function shopAndAnswers(this: Workflow, ...answers: never[]): unknown[] {
  return [this instanceof Shop ? this.shop : "unknown", ...answers];
}
