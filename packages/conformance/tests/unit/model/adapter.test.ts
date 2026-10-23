import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import {
  adapterOf,
  type AdapterScript,
  type Answer,
  answerFor,
  answerOf,
  refuseUnheldAccess,
  unscriptedAdapter,
} from "../../../src/model/adapter.js";
import { nonValue } from "../../../src/model/value.js";

describe("what a returns sentence says an adapter answers", () => {
  it.each([
    ["nothing", "nothing", { kind: "returns nothing" }],
    ["a non-value", "a non-value", { kind: "returns", value: nonValue }],
    [
      "a value written as JSON",
      '"EUR"',
      { kind: "returns", value: { kind: "value", value: "EUR" } },
    ],
    [
      "a key read from the data bag",
      '"price.charge" of type integer, read from the data bag,',
      {
        kind: "returns what it reads",
        key: "price.charge",
        type: "integer",
        through: "its access",
      },
    ],
  ])("is read from what it writes: %s", (_, written, answer) => {
    expect(answerOf(written)).toEqual(answer);
  });
});

describe("an adapter's answering", () => {
  const pricing = unscriptedAdapter("pricing", ["charge", "ship"]);
  pricing.answers.push(
    { key: "amount", answer: { kind: "fails", message: "down" } },
    {
      key: "currency",
      step: "ship",
      answer: { kind: "returns the step name" },
    },
  );

  it.each<[string, string, string, Answer]>([
    [
      "an input answered for any step",
      "ship",
      "amount",
      { kind: "fails", message: "down" },
    ],
    [
      "an input answered for the step named",
      "ship",
      "currency",
      { kind: "returns the step name" },
    ],
    [
      "an input answered only for another step",
      "charge",
      "currency",
      { kind: "returns nothing" },
    ],
  ])("is as scripted, or nothing: %s", (_, step, key, answer) => {
    expect(answerFor(pricing, step, key)).toEqual(answer);
  });
});

describe("the adapter of a step", () => {
  it("is the one attached to it", () => {
    const pricing = unscriptedAdapter("pricing", ["charge"]);
    const shipping = unscriptedAdapter("shipping", ["ship"]);
    expect(adapterOf([pricing, shipping], "ship")).toBe(shipping);
  });

  it("is refused for a step no adapter is attached to", () => {
    expect(() => adapterOf([], "ship")).toThrow(
      new ModelError('no input adapter is attached to "ship"'),
    );
  });
});

describe("refuseUnheldAccess", () => {
  const readsPrice: Answer = {
    kind: "returns what it reads",
    key: "price",
    type: "integer",
    through: "its access",
  };

  it.each<[string, (script: AdapterScript) => void]>([
    [
      "writes",
      (script) => script.writes.push(["price", { kind: "value", value: 0 }]),
    ],
    [
      "keeps its access",
      (script) => {
        script.keepsAccessFor = "charge";
      },
    ],
    [
      "reads through its access",
      (script) => script.answers.push({ key: "amount", answer: readsPrice }),
    ],
  ])(
    "refuses a script that uses an access it does not request: one that %s",
    (_, uses) => {
      const script = unscriptedAdapter("pricing", ["charge"]);
      uses(script);
      expect(() => {
        refuseUnheldAccess(script);
      }).toThrow(
        new ModelError(
          'the input adapter "pricing" uses a data bag access it does not request',
        ),
      );
    },
  );

  it("refuses a script that reads through a kept access it never keeps", () => {
    const script = unscriptedAdapter("pricing", ["charge"]);
    script.requests.push({ kind: "data bag" });
    script.answers.push({
      key: "amount",
      answer: { ...readsPrice, through: "the kept access" },
    });
    expect(() => {
      refuseUnheldAccess(script);
    }).toThrow(
      new ModelError(
        'the input adapter "pricing" reads through a data bag access it never keeps',
      ),
    );
  });

  it("accepts a script that requests the access it uses and keeps", () => {
    const script = unscriptedAdapter("pricing", ["charge"]);
    script.requests.push({ kind: "data bag" });
    script.keepsAccessFor = "charge";
    script.answers.push({
      key: "amount",
      answer: { ...readsPrice, through: "the kept access" },
    });
    expect(() => {
      refuseUnheldAccess(script);
    }).not.toThrow();
  });
});
