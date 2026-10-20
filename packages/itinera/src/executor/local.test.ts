import { describe, expect, it } from "vitest";
import { charging, orders } from "../engine/fixtures.js";
import type { Scripting } from "../engine/script.js";
import { LocalExecutor, Refusal } from "../executor.js";
import { runScripted } from "./local.js";
import type { WorkflowInstance } from "../instance.js";
import type { Dispatcher, DispatcherFactory } from "../report.js";
import { DefaultDispatcherFactory } from "../report/default-dispatcher.js";
import { Ending } from "../testing/ending.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { stepMock } from "../testing/step-mock.js";

class Counting implements DispatcherFactory {
  readonly made: Dispatcher[] = [];

  create(): Dispatcher {
    const dispatcher = new DefaultDispatcherFactory().create();
    this.made.push(dispatcher);
    return dispatcher;
  }
}

/** A script that describes no attempt, so that every step runs for real. */
const playingNothing: Scripting = {
  building: doNothing,
  play: doNothing,
};

function doNothing(): undefined {
  return undefined;
}

describe("LocalExecutor", () => {
  it("delivers events through a default dispatcher when it is given no factory", async () => {
    const recorder = new RecordingReporter();
    await new LocalExecutor().run(charging({}, { reporters: [recorder] }));
    expect(recorder.path).toEqual([
      "charge attempt 1 succeeded",
      "journey succeeded",
    ]);
  });

  it("makes a new dispatcher with its factory for each journey", async () => {
    const factory = new Counting();
    const executor = new LocalExecutor(factory);
    await executor.run(charging());
    await executor.run(charging());
    expect(factory.made).toHaveLength(2);
    expect(factory.made[0]).not.toBe(factory.made[1]);
  });

  it("refuses an instance while it runs a journey, and lets that journey run on", async () => {
    const slow = stepMock({ attempts: [Ending.success], asynchronous: true });
    const workflow = orders(slow.builder("charge"));
    const executor = new LocalExecutor();
    const running = executor.run(workflow.instance());
    await expect(executor.run(charging())).rejects.toEqual(
      new Refusal({ kind: "journey running" }),
    );
    expect((await running).isSucceeded()).toBe(true);
  });

  it("refuses a scripted run while it runs a journey", async () => {
    const slow = stepMock({ attempts: [Ending.success], asynchronous: true });
    const executor = new LocalExecutor();
    const running = executor.run(orders(slow.builder("charge")).instance());
    await expect(
      runScripted(executor, charging(), playingNothing),
    ).rejects.toEqual(new Refusal({ kind: "journey running" }));
    expect((await running).isSucceeded()).toBe(true);
  });

  it("rejects an instance that instance() did not make, which a cast let through", async () => {
    const forged = Object.create(charging()) as WorkflowInstance;
    await expect(new LocalExecutor().run(forged)).rejects.toThrow(
      new TypeError(
        "run was given an instance that instance() did not make: make the workflow object with its class's build(), then call instance() on it",
      ),
    );
  });

  it("runs another journey once the one it ran has ended", async () => {
    const executor = new LocalExecutor();
    await executor.run(charging());
    expect((await executor.run(charging())).isSucceeded()).toBe(true);
  });

  it("runs another journey once it refused an instance", async () => {
    const executor = new LocalExecutor();
    await executor.run(charging({ order: Number.NaN })).catch(String);
    expect((await executor.run(charging())).isSucceeded()).toBe(true);
  });
});
