import { describe, expect, it } from "vitest";
import { Refusal } from "../../../src/executor/refusal.js";
import {
  DefaultDispatcher,
  DefaultDispatcherFactory,
} from "../../../src/report/default-dispatcher.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import {
  charging,
  factoryOf,
  FailingOnGlobalMetadata,
  Swallowing,
} from "../../fixtures/engine.js";
import { start } from "../../../src/engine/start.js";

const factory = new DefaultDispatcherFactory();

async function refusedWith(started: Promise<unknown>): Promise<unknown> {
  const refusal = await started.then(String, (thrown: unknown) => thrown);
  expect(refusal).toBeInstanceOf(Refusal);
  return refusal instanceof Refusal ? refusal.refused : undefined;
}

describe("start", () => {
  it("refuses an instance handed over before", async () => {
    const instance = charging();
    await start(instance, factory);
    expect(await refusedWith(start(instance, factory))).toEqual({
      kind: "instance ran",
    });
  });

  it("refuses an instance handed over before even when it was refused", async () => {
    const instance = charging({ order: Number.NaN });
    await refusedWith(start(instance, factory));
    expect(await refusedWith(start(instance, factory))).toEqual({
      kind: "instance ran",
    });
  });

  it("refuses initial data and global metadata that are not values, and journey_id, naming their keys in order", async () => {
    const instance = charging(
      { order: Number.NaN, shop: "corner", total: Number.POSITIVE_INFINITY },
      { reportersGlobalMetadata: { journey_id: "mine", tenant: Number.NaN } },
    );
    expect(await refusedWith(start(instance, factory))).toEqual({
      kind: "initial values",
      initialData: ["order", "total"],
      initialGlobalMetadata: ["journey_id", "tenant"],
    });
  });

  it("refuses the instance when the dispatcher factory fails", async () => {
    const failing = {
      create: () => Promise.reject(new Error("no queue")),
    };
    expect(await refusedWith(start(charging(), failing))).toEqual({
      kind: "dispatcher factory failed",
      error: new Error("no queue"),
      errorMessage: "no queue",
    });
  });

  it("refuses the instance when the dispatcher fails while reporters are added", async () => {
    const dispatcher = new DefaultDispatcher();
    dispatcher.add = () => {
      throw new Error("full");
    };
    const instance = charging({}, { reporters: [new RecordingReporter()] });
    expect(
      await refusedWith(start(instance, factoryOf(dispatcher))),
    ).toMatchObject({
      kind: "dispatcher failed",
      errorMessage: "full",
    });
  });

  it("sets the journey ID first, then the initial global metadata in order", async () => {
    const recorder = new RecordingReporter();
    const instance = charging(
      {},
      {
        reporters: [recorder],
        reportersGlobalMetadata: { tenant: "acme", region: "eu" },
      },
    );
    await start(instance, factory);
    expect([...recorder.globalMetadata]).toEqual([
      ["journey_id", instance.journeyId],
      ["tenant", "acme"],
      ["region", "eu"],
    ]);
  });

  it("refuses the instance when a reporter fails on global metadata", async () => {
    const instance = charging(
      {},
      { reporters: [new FailingOnGlobalMetadata("disk full")] },
    );
    expect(await refusedWith(start(instance, factory))).toEqual({
      kind: "global metadata not set",
      error: new Error("disk full"),
      errorMessage: "disk full",
    });
  });

  it("refuses the instance when its dispatcher swallows a reporter's failure on global metadata", async () => {
    const instance = charging(
      {},
      { reporters: [new FailingOnGlobalMetadata("disk full")] },
    );
    expect(
      await refusedWith(start(instance, factoryOf(new Swallowing()))),
    ).toMatchObject({
      kind: "global metadata not set",
      errorMessage: "disk full",
    });
  });

  it("captures the initial data", async () => {
    const instance = charging({ order: { id: "A-1" } });
    const { data } = await start(instance, factory);
    expect([...data]).toEqual([["order", { id: "A-1" }]]);
  });
});
