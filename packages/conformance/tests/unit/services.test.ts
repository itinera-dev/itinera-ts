import { describe, expect, it } from "vitest";
import {
  answering,
  FirstLabeller,
  operated,
  runtimeNameOf,
  ScriptedMeter,
  SecondLabeller,
} from "../../src/services.js";

describe("the runner's services", () => {
  it.each([
    ["a first labeller", new FirstLabeller("stock 1", answering(undefined))],
    ["a second labeller", new SecondLabeller("stock 1", answering(undefined))],
  ])("labels %s with the label it was made with", (_, labeller) => {
    expect(operated("labeller", labeller)).toBe("stock 1");
  });

  it("reads a meter", () => {
    expect(operated("meter", new ScriptedMeter(answering(undefined)))).toBe(
      "1",
    );
  });

  it.each([
    ["a labeller", "labeller", new FirstLabeller("stock 1", answering("down"))],
    ["a meter", "meter", new ScriptedMeter(answering("down"))],
  ] as const)(
    "fails the operation of %s that fails when used",
    (_, type, service) => {
      expect(() => operated(type, service)).toThrow("down");
    },
  );

  it.each([
    ["first labeller", "FirstLabeller"],
    ["second labeller", "SecondLabeller"],
  ] as const)(
    "names the implementation %s as the runtime names its class",
    (implementation, name) => {
      expect(runtimeNameOf(implementation)).toBe(name);
    },
  );
});
