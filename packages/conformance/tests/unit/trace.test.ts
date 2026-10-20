import { describe, expect, it } from "vitest";
import { ModelError } from "../../src/model.js";
import { Row } from "../../src/model/table.js";
import {
  areExactly,
  expectedLine,
  includesInOrder,
  lineOf,
} from "../../src/trace.js";
import {
  attemptStarted,
  started,
  stepInfo,
  stepSucceeded,
} from "../fixtures/trace.js";

function row(cells: Record<string, string>): Row {
  return new Row(new Map(Object.entries(cells)));
}

const stream = [started, attemptStarted("charge"), stepSucceeded("charge")].map(
  lineOf,
);

const charged = expectedLine(row({ event: "step_succeeded", step: "charge" }));

describe("expectedLine", () => {
  it("refuses a column event tables do not have, as an error in the case", () => {
    expect(() =>
      expectedLine(row({ event: "journey_started", colour: "red" })),
    ).toThrow(ModelError);
  });

  it("leaves empty cells uncompared", () => {
    const line = expectedLine(
      row({ event: "step_succeeded", step: "", attempt: "1" }),
    );
    expect([...line.cells]).toEqual([["attempt", "1"]]);
  });

  it("compares an implementation as the name its type has at run time", () => {
    const line = expectedLine(
      row({ event: "service_provided", implementation: "first labeller" }),
    );
    expect([...line.cells]).toEqual([["implementation", "FirstLabeller"]]);
  });
});

describe("includesInOrder", () => {
  it.each([
    ["with others in between", [started, stepSucceeded("charge")], true],
    ["out of order", [stepSucceeded("charge"), started], false],
    [
      "once more than they happened",
      [stepSucceeded("charge"), stepSucceeded("charge")],
      false,
    ],
  ])("compares expected events %s", (_, expected, included) => {
    expect(includesInOrder(stream, expected.map(lineOf))).toBe(included);
  });

  it("compares only the cells an expected line states", () => {
    expect(includesInOrder(stream, [charged])).toBe(true);
  });
});

describe("areExactly", () => {
  it.each([
    ["the whole stream, in order", stream, true],
    ["a stream missing its first event", stream.slice(1), false],
    [
      "a stream whose first event differs",
      [charged, ...stream.slice(1)],
      false,
    ],
  ])("holds only for the whole stream, in order: %s", (_, expected, exact) => {
    expect(areExactly(stream, expected)).toBe(exact);
  });

  it.each([
    ["the data it carries", '{"ms": 900}', true],
    ["no data, when it carries some", "none", false],
  ])("compares an event's data against %s", (_, data, exact) => {
    const emitted = [lineOf(stepInfo("charge", "charging", { ms: 900 }))];
    expect(areExactly(emitted, [emittedSaying(data)])).toBe(exact);
  });
});

function emittedSaying(data: string) {
  return expectedLine(row({ event: "step_info", data }));
}
