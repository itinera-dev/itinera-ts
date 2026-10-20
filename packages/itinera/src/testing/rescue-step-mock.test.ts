import { describe, expect, it } from "vitest";
import { RescueStep } from "../step/rescue.js";
import { Ending } from "./ending.js";
import { RescueStepMock, rescueStepMock } from "./rescue-step-mock.js";

const crashed = Ending.abnormalTermination("refresh down");

function played(made: RescueStepMock): unknown {
  try {
    return made.run();
  } catch (error) {
    return error;
  }
}

describe("rescueStepMock", () => {
  it("makes a class extending RescueStepMock and RescueStep", () => {
    const made = new (rescueStepMock({ attempts: [Ending.success] }))();
    expect([
      made instanceof RescueStepMock,
      made instanceof RescueStep,
    ]).toEqual([true, true]);
  });

  it("plays each rescue step's ending in the order they are built, the last again for every later one", () => {
    const renew = rescueStepMock({
      attempts: [crashed, Ending.failure("no-refresh"), Ending.success],
    });
    expect(
      [new renew(), new renew(), new renew(), new renew()].map(played),
    ).toEqual([
      new Error("refresh down"),
      { kind: "failure", reason: { code: "no-refresh" } },
      { kind: "success" },
      { kind: "success" },
    ]);
  });

  it("gives its outcome through a promise when asynchronous", async () => {
    const renew = rescueStepMock({
      attempts: [Ending.success],
      asynchronous: true,
    });
    const returned = new renew().run();
    expect(returned).toBeInstanceOf(Promise);
    expect(await returned).toEqual({ kind: "success" });
  });

  it("rejects when asynchronous and terminating abnormally", async () => {
    const renew = rescueStepMock({ attempts: [crashed], asynchronous: true });
    await expect(new renew().run()).rejects.toThrow("refresh down");
  });

  it("keeps what it was built with, in order", () => {
    const renew = rescueStepMock({ attempts: [Ending.success] });
    expect(new renew("A-1", { code: "expired" }).inputs).toEqual([
      "A-1",
      { code: "expired" },
    ]);
  });

  it("cannot be built when its script says so", () => {
    const renew = rescueStepMock({
      attempts: [Ending.success],
      buildFailure: "no client",
    });
    expect(() => new renew()).toThrow("no client");
  });
});
