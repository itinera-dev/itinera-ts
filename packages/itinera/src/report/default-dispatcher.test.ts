import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import {
  journeyAborted,
  journeyStarted,
  stepSucceeded,
} from "../event/fixtures.js";
import type { Reporter } from "../report.js";
import type { PlainValue } from "../value.js";
import {
  DefaultDispatcher,
  DefaultDispatcherFactory,
} from "./default-dispatcher.js";

class Recording implements Reporter {
  constructor(
    readonly name: string,
    readonly log: string[],
  ) {}

  report(event: Event): void {
    this.log.push(`${this.name} ${event.kind}`);
  }

  receiveGlobalMetadata(key: string): void {
    this.log.push(`${this.name} ${key}`);
  }
}

class Slow implements Reporter {
  constructor(
    readonly name: string,
    readonly log: string[],
  ) {}

  async report(event: Event): Promise<void> {
    await Promise.resolve();
    this.log.push(`${this.name} ${event.kind}`);
  }

  async receiveGlobalMetadata(key: string): Promise<void> {
    await Promise.resolve();
    this.log.push(`${this.name} ${key}`);
  }
}

class Failing extends Recording {
  override report(event: Event): void {
    super.report(event);
    throw new Error(`${this.name} failed`);
  }

  override receiveGlobalMetadata(key: string): void {
    super.receiveGlobalMetadata(key);
    throw new Error(`${this.name} failed`);
  }
}

function dispatcherOf(
  ...reporters: readonly (new (name: string, log: string[]) => Reporter)[]
): { readonly dispatcher: DefaultDispatcher; readonly log: string[] } {
  const log: string[] = [];
  const dispatcher = new DefaultDispatcher();
  for (const [index, Kind] of reporters.entries()) {
    dispatcher.add(new Kind(String(index + 1), log));
  }
  return { dispatcher, log };
}

describe("DefaultDispatcher", () => {
  it("delivers each event to every reporter, in the order they were added", async () => {
    const { dispatcher, log } = dispatcherOf(Recording, Recording);
    await dispatcher.dispatch(journeyStarted());
    await dispatcher.dispatch(stepSucceeded());
    expect(log).toEqual([
      "1 journey_started",
      "2 journey_started",
      "1 step_succeeded",
      "2 step_succeeded",
    ]);
  });

  it("waits for a reporter that returns a promise before the next", async () => {
    const { dispatcher, log } = dispatcherOf(Slow, Recording);
    await dispatcher.dispatch(journeyStarted());
    expect(log).toEqual(["1 journey_started", "2 journey_started"]);
  });

  it("stops an event at the reporter that fails, and passes its failure on", async () => {
    const { dispatcher, log } = dispatcherOf(Recording, Failing, Recording);
    await expect(dispatcher.dispatch(stepSucceeded())).rejects.toThrow(
      "2 failed",
    );
    expect(log).toEqual(["1 step_succeeded", "2 step_succeeded"]);
  });

  it("delivers journey_aborted past failing reporters, then passes the first failure on", async () => {
    const { dispatcher, log } = dispatcherOf(Failing, Recording, Failing);
    await expect(dispatcher.dispatch(journeyAborted())).rejects.toThrow(
      "1 failed",
    );
    expect(log).toEqual([
      "1 journey_aborted",
      "2 journey_aborted",
      "3 journey_aborted",
    ]);
  });

  it("passes global metadata to every reporter, in the order they were added", async () => {
    const { dispatcher, log } = dispatcherOf(Recording, Recording);
    await dispatcher.setGlobalMetadata("tenant", "acme");
    expect(log).toEqual(["1 tenant", "2 tenant"]);
  });

  it("waits for a reporter that receives global metadata asynchronously before the next", async () => {
    const { dispatcher, log } = dispatcherOf(Slow, Recording);
    await dispatcher.setGlobalMetadata("tenant", "acme");
    expect(log).toEqual(["1 tenant", "2 tenant"]);
  });

  it("passes global metadata over reporters that do not take it", async () => {
    const log: string[] = [];
    const dispatcher = new DefaultDispatcher();
    dispatcher.add({ report: () => undefined });
    dispatcher.add(new Recording("2", log));
    await dispatcher.setGlobalMetadata("tenant", "acme");
    expect(log).toEqual(["2 tenant"]);
  });

  it("stops global metadata at the reporter that fails, and passes its failure on", async () => {
    const { dispatcher, log } = dispatcherOf(Failing, Recording);
    await expect(
      dispatcher.setGlobalMetadata("tenant", "acme"),
    ).rejects.toThrow("1 failed");
    expect(log).toEqual(["1 tenant"]);
  });

  it("passes global metadata on as it was given", async () => {
    const given: PlainValue[] = [];
    const dispatcher = new DefaultDispatcher();
    dispatcher.add({
      report: () => undefined,
      receiveGlobalMetadata: (_, value) => {
        given.push(value);
      },
    });
    const value = { region: "eu" };
    await dispatcher.setGlobalMetadata("tenant", value);
    expect(given).toEqual([value]);
  });
});

describe("DefaultDispatcherFactory", () => {
  it("creates a new dispatcher each time", () => {
    const factory = new DefaultDispatcherFactory();
    expect(factory.create()).not.toBe(factory.create());
  });

  it("creates dispatchers that share no reporter", async () => {
    const log: string[] = [];
    const factory = new DefaultDispatcherFactory();
    factory.create().add(new Recording("1", log));
    await factory.create().dispatch(journeyStarted());
    expect(log).toEqual([]);
  });
});
