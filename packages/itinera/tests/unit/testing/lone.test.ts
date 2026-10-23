import { describe, expect, it } from "vitest";
import { None, Some } from "../../../src/option.js";
import { Level } from "../../../src/testing/emitted.js";
import { Lone } from "../../../src/testing/lone.js";

describe("Lone", () => {
  it("keeps what a step's reporter emits, with its level, message and data, in order", async () => {
    const lone = new Lone("step", false);
    await lone.handles.reporter.info("charged", { amount: 40 });
    await lone.handles.reporter.warning("slow");
    await lone.handles.reporter.error("retried");
    expect(lone.emitted).toEqual([
      { level: Level.Info, message: "charged", data: Some({ amount: 40 }) },
      { level: Level.Warning, message: "slow", data: None },
      { level: Level.Error, message: "retried", data: None },
    ]);
  });

  it("keeps what a hook's reporter emits", async () => {
    const lone = new Lone("hook", false);
    await lone.handles.reporter.warning("audited late");
    expect(lone.emitted).toEqual([
      { level: Level.Warning, message: "audited late", data: None },
    ]);
  });

  it("keeps the latest value of each entry of global metadata set", async () => {
    const lone = new Lone("step", false);
    await lone.handles.reporter.setGlobalMetadata("tenant", "acme");
    await lone.handles.reporter.setGlobalMetadata("tenant", "globex");
    expect([...lone.globalMetadata]).toEqual([["tenant", "globex"]]);
  });

  it("interrupts every call and keeps nothing when failing", async () => {
    const lone = new Lone("step", true);
    await expect(lone.handles.reporter.info("charged")).rejects.toThrow(
      "the journey was aborted: reporter failed",
    );
    await expect(
      lone.handles.reporter.setGlobalMetadata("tenant", "acme"),
    ).rejects.toThrow();
    expect([lone.emitted, [...lone.globalMetadata]]).toEqual([[], []]);
  });

  it("interrupts the call that sets journey_id and every later one", async () => {
    const lone = new Lone("step", false);
    await expect(
      lone.handles.reporter.setGlobalMetadata("journey_id", "forged"),
    ).rejects.toThrow();
    await expect(lone.handles.reporter.info("charged")).rejects.toThrow();
    expect([lone.emitted, [...lone.globalMetadata]]).toEqual([[], []]);
  });
});
