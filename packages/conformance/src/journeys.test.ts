import type { Event } from "itinera/unstable";
import { describe, expect, it } from "vitest";
import { admitted, type Journey, ran, streamOf } from "./journeys.js";
import { Model, ModelError } from "./model.js";
import { Recorders } from "./recorders.js";
import { Witness } from "./witness.js";

/** A workflow of one step listing the reporters, under the default dispatcher. */
function listing(...reporters: string[]): Model {
  const model = new Model();
  model.declare("orders", ["charge"]);
  model.listReporters(reporters);
  model.dispatchWith({ kind: "default" });
  return model;
}

async function journeysOf(
  model: Model,
  recorders: Recorders,
  times: number,
): Promise<Journey[]> {
  const admission = admitted(model, recorders, new Witness());
  if (admission.kind === "refused") {
    throw admission.violations;
  }
  return ran(admission.workflow, model, recorders, times);
}

function journeyIdOf(event: Event): string {
  return event.journeyId;
}

describe("the stream of a journey", () => {
  it("is what the first listed reporter that never failed received, under the default dispatcher", async () => {
    const model = listing("audit", "metrics");
    model.fails("audit", { kind: "first event" });
    const recorders = new Recorders(model.reporterFailures);
    const journeys = await journeysOf(model, recorders, 1);
    const [metrics] = recorders.made("metrics");
    expect(metrics?.events).not.toHaveLength(0);
    expect(streamOf(model, recorders, journeys, journeys[0])).toEqual(
      metrics?.events,
    );
  });

  it("cannot be read when every listed reporter failed", async () => {
    const model = listing("audit", "metrics");
    model.fails("audit", { kind: "first event" });
    model.fails("metrics", { kind: "first event" });
    const recorders = new Recorders(model.reporterFailures);
    const journeys = await journeysOf(model, recorders, 1);
    expect(() => streamOf(model, recorders, journeys, journeys[0])).toThrow(
      ModelError,
    );
  });

  it("is only that journey's events of the reporter the runner's dispatchers hold", async () => {
    const model = new Model();
    model.declare("orders", ["charge"]);
    const recorders = new Recorders(model.reporterFailures);
    const journeys = await journeysOf(model, recorders, 2);
    const second = journeys[1];
    const stream = streamOf(model, recorders, journeys, second);
    expect(stream).toHaveLength(4);
    expect(new Set(stream.map(journeyIdOf))).toEqual(
      new Set([second?.journeyId]),
    );
    expect(streamOf(model, recorders, journeys, undefined)).toHaveLength(8);
  });
});
