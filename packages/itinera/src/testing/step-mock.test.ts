import { describe, expect, it } from "vitest";
import { Step } from "../step.js";
import { isOutcome } from "../step/outcome.js";
import { Ending } from "./ending.js";
import { StepMock, stepMock } from "./step-mock.js";

const crashed = Ending.abnormalTermination("timeout");

function played(made: StepMock): unknown {
  try {
    return made.run();
  } catch (error) {
    return error;
  }
}

describe("stepMock", () => {
  it("makes a class extending StepMock and Step", () => {
    const made = new (stepMock({ attempts: [Ending.success] }))();
    expect([made instanceof StepMock, made instanceof Step]).toEqual([
      true,
      true,
    ]);
  });

  it("plays each attempt's ending in order, the last again for every later attempt", () => {
    const charge = stepMock({ attempts: [crashed, Ending.success] });
    const endings = [new charge(), new charge(), new charge()].map(played);
    expect(endings.map(isOutcome)).toEqual([false, true, true]);
    expect(endings[0]).toEqual(new Error("timeout"));
  });

  it("counts the attempts of each class on its own", () => {
    const script = { attempts: [crashed, Ending.success] } as const;
    const first = stepMock(script);
    const second = stepMock(script);
    played(new first());
    expect(played(new second())).toEqual(new Error("timeout"));
  });

  it("gives its outcome through a promise when asynchronous", async () => {
    const charge = stepMock({ attempts: [Ending.success], asynchronous: true });
    const returned = new charge().run();
    expect(returned).toBeInstanceOf(Promise);
    expect(isOutcome(await returned)).toBe(true);
  });

  it("rejects when asynchronous and terminating abnormally", async () => {
    const charge = stepMock({ attempts: [crashed], asynchronous: true });
    await expect(new charge().run()).rejects.toThrow("timeout");
  });

  it("cannot be built when its script says so", () => {
    const charge = stepMock({
      attempts: [Ending.success],
      buildFailure: "no connection",
    });
    expect(() => new charge()).toThrow("no connection");
  });
});
