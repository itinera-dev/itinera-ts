import {
  Contributions,
  HookEventReporter,
  StepEventReporter,
} from "itinera/testing";
import { describe, expect, it } from "vitest";
import { type Call, CarryingOn } from "../../../src/alone/carrying-on.js";

/** A handle's methods, each called with a key and a value. */
type Methods = Readonly<
  Record<string, (key: string, value: number) => unknown>
>;

const reporterMethods = ["info", "warning", "error", "setGlobalMetadata"];

/** A handle whose methods are its own properties, as itinera lends them. */
const handle = Object.freeze({
  contribute: (key: string, value: number) => value + key.length,
  info: async (message: string) => Promise.resolve(message.length),
  setGlobalMetadata: (key: string): never => {
    throw new Error(`refused ${key}`);
  },
  warning: async (message: string): Promise<never> =>
    Promise.reject(new Error(`refused ${message}`)),
});

describe("CarryingOn", () => {
  it("gives what each call gives, recording it in order with its first argument", async () => {
    const carryingOn = new CarryingOn();
    const lent = carryingOn.lend(handle, "reporter");
    expect([lent.contribute("due", 40), await lent.info("charging")]).toEqual([
      43, 8,
    ]);
    expect(carryingOn.calls).toEqual([
      {
        handle: "reporter",
        method: "contribute",
        key: "due",
        interrupted: false,
      },
      {
        handle: "reporter",
        method: "info",
        key: "charging",
        interrupted: false,
      },
    ]);
  });

  it.each([
    ["throws", (lent: typeof handle) => lent.setGlobalMetadata("journey_id")],
    ["rejects", (lent: typeof handle) => lent.warning("late")],
  ])(
    "carries on after a call that %s, marking it interrupted",
    async (_, calling) => {
      const carryingOn = new CarryingOn();
      await calling(carryingOn.lend(handle, "contributor"));
      expect(carryingOn.calls).toMatchObject([{ interrupted: true }]);
    },
  );

  it.each([
    [
      "the contributions recorder's contributor",
      () => new Contributions().contributor,
      ["contribute"],
    ],
    [
      "the step event reporter's reporter",
      () => new StepEventReporter().reporter,
      reporterMethods,
    ],
    [
      "the hook event reporter's reporter",
      () => new HookEventReporter().reporter,
      reporterMethods,
    ],
  ])(
    "lends every method of %s, as itinera makes it",
    async (_, made: () => object, methods: string[]) => {
      const carryingOn = new CarryingOn();
      const handle = made();
      const lent = carryingOn.lend(handle, "reporter") as Methods;
      expect(Object.keys(lent)).toEqual(Object.keys(handle));
      for (const method of methods) {
        await lent[method]?.("key", 1);
      }
      expect(carryingOn.calls.map(methodOf)).toEqual(methods);
    },
  );
});

function methodOf(call: Call): string {
  return call.method;
}
