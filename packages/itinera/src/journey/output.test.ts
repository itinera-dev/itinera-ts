import { describe, expect, it } from "vitest";
import { Payment } from "../engine/fixtures.js";
import { None, Some } from "../option.js";
import { classOf, integer, optional, string } from "../value/token.js";
import type { PlainValue } from "../value.js";
import { dataBagOf } from "./data-bag.js";
import { OutputError, outputOf } from "./output.js";

const receipt = dataBagOf(
  new Map<string, PlainValue>([
    ["receipt", "R-1"],
    ["amount", 1250],
  ]),
);

describe("outputOf", () => {
  it("reads each key of the shape as its type", () => {
    expect(outputOf(receipt, { receipt: string, amount: integer })).toEqual({
      receipt: "R-1",
      amount: 1250,
    });
  });

  it("gives an Option under a key whose type is optional", () => {
    expect(
      outputOf(receipt, { receipt: optional(string), note: optional(string) }),
    ).toEqual({ receipt: Some("R-1"), note: None });
  });

  it("gives an instance made by fromValue under a key read as a class", () => {
    const { amount } = outputOf(receipt, { amount: classOf(Payment) });
    expect(amount).toEqual(new Payment(1250));
  });

  it("gives a frozen output", () => {
    expect(Object.isFrozen(outputOf(receipt, { amount: integer }))).toBe(true);
  });

  it.each([
    [
      "a key that holds no value",
      () => outputOf(receipt, { receipt: string, note: string }),
      new OutputError({ kind: "absent", key: "note" }),
    ],
    [
      "a key whose value its type refuses",
      () => outputOf(receipt, { receipt: integer }),
      new OutputError({ kind: "other type", key: "receipt" }),
    ],
    [
      "the first key in the shape's order that cannot be read",
      () => outputOf(receipt, { note: string, receipt: integer }),
      new OutputError({ kind: "absent", key: "note" }),
    ],
  ])("throws an OutputError naming %s", (_, read, error) => {
    expect(read).toThrow(error);
  });
});

describe("OutputError", () => {
  it.each([
    [
      { kind: "aborted" },
      "the journey was aborted, so it has no data bag to read",
    ],
    [
      { kind: "absent", key: "note" },
      'the data bag holds no value under "note"',
    ],
    [
      { kind: "other type", key: "amount" },
      'the value under "amount" is not of the type the output reads',
    ],
  ] as const)("says what it could not read: %o", (problem, message) => {
    const error = new OutputError(problem);
    expect([error.name, error.message, error.problem]).toEqual([
      "OutputError",
      message,
      problem,
    ]);
    expect(error).toBeInstanceOf(Error);
  });
});
