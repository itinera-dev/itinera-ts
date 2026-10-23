import { describe, expect, it } from "vitest";
import {
  checkedOf,
  marking,
  markingValue,
  requestsGiven,
} from "../../../src/declaration/marking.js";
import type { Request } from "../../../src/declaration/request.js";
import { integer, optional } from "../../../src/value/token.js";

const contributing: Request = { kind: "contributor" };

const contributor = marking<ParameterDecorator>(contributing);

class Unmarked {
  constructor(
    readonly first: unknown,
    readonly second: unknown,
  ) {}
}

class Marked {
  constructor(@contributor readonly first: unknown) {}
}

describe("requestsGiven", () => {
  it("gives the requests of the decorators it is given, in order", () => {
    const amount = markingValue("input", "amount", integer);
    expect(requestsGiven(Unmarked, undefined, [contributor, amount])).toEqual([
      contributing,
      {
        kind: "input",
        key: "amount",
        type: { schema: integer, optional: false },
      },
    ]);
  });

  it.each([
    [
      "a request for a value whose type is not written",
      markingValue("input", "amount", undefined),
    ],
    ["a type alone", integer],
  ])("refuses %s", (_, given) => {
    expect(() =>
      requestsGiven(Unmarked, undefined, [contributor, given]),
    ).toThrow(
      "the constructor of Unmarked: parameter 2 is given what is not a request that writes its type",
    );
  });

  it("refuses a parameter left without a request", () => {
    expect(() => requestsGiven(Unmarked, undefined, [contributor])).toThrow(
      "the constructor of Unmarked: parameter 2 carries no request",
    );
  });

  it("refuses a class whose decorators declare the requests", () => {
    expect(() => requestsGiven(Marked, undefined, [contributor])).toThrow(
      "the constructor of Marked declares its requests with decorators, so a builder cannot be given them",
    );
  });
});

describe("checkedOf", () => {
  it("checks the type written, as required", () => {
    expect(checkedOf(integer, Unmarked, undefined, 0)).toEqual({
      schema: integer,
      optional: false,
    });
  });

  it("checks the type optional wraps, as optional", () => {
    expect(checkedOf(optional(integer), Unmarked, undefined, 0)).toEqual({
      schema: integer,
      optional: true,
    });
  });

  it("names the parameter whose type is not written and the metadata cannot say", () => {
    expect(() => checkedOf(undefined, Marked, undefined, 0)).toThrow(
      "the constructor of Marked: the type of parameter 1 cannot be read from the metadata, so its request must write it",
    );
  });
});
