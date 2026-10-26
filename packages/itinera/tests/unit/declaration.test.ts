import { describe, expect, it } from "vitest";
import {
  checkedOf,
  marking,
  methodsWithRequests,
  requestsOf,
  requireMetadata,
} from "../../src/declaration.js";
import type { Request } from "../../src/declaration/request.js";
import { integer, optional } from "../../src/value/token.js";

const contributing: Request = { kind: "contributor" };

function contributor(): ParameterDecorator {
  return marking(() => contributing);
}

function marked(): MethodDecorator {
  return () => undefined;
}

class Recorded {
  constructor(@contributor() readonly first: unknown) {}

  @marked()
  withDefault(size = 1): number {
    return size;
  }

  withoutMetadata(size = 1): number {
    return size;
  }

  requesting(@contributor() first: unknown): unknown {
    return first;
  }

  @marked()
  missing(first: unknown, @contributor() second: unknown): unknown {
    return [first, second];
  }
}

describe("requestsOf", () => {
  it("gives the requests of a constructor's parameters in order", () => {
    expect(requestsOf(Recorded, undefined)).toEqual([contributing]);
  });

  it("gives the requests of a method's parameters in order", () => {
    expect(requestsOf(Recorded, "requesting")).toEqual([contributing]);
  });

  it("names a parameter that carries no request", () => {
    expect(() => requestsOf(Recorded, "missing")).toThrow(
      "Recorded.missing: parameter 1 carries no request",
    );
  });

  it("counts a parameter with a default value from what the compiler recorded", () => {
    expect(() => requestsOf(Recorded, "withDefault")).toThrow(
      "Recorded.withDefault: parameter 1 carries no request",
    );
  });

  it("misses a parameter with a default value where nothing was recorded", () => {
    expect(requestsOf(Recorded, "withoutMetadata")).toEqual([]);
  });
});

describe("marking", () => {
  it("refuses a second request on one parameter", () => {
    expect(() => {
      class Twice {
        run(@contributor() @contributor() first: unknown): unknown {
          return first;
        }
      }
      return Twice;
    }).toThrow("Twice.run: parameter 1 carries two requests");
  });
});

describe("methodsWithRequests", () => {
  it("lists the methods whose parameters carry a request", () => {
    expect(methodsWithRequests(Recorded)).toEqual(["requesting", "missing"]);
  });
});

describe("checkedOf", () => {
  it("checks the type written, as required", () => {
    expect(checkedOf(integer, Recorded, undefined, 0)).toEqual({
      schema: integer,
      optional: false,
    });
  });

  it("checks the type optional wraps, as optional", () => {
    expect(checkedOf(optional(integer), Recorded, undefined, 0)).toEqual({
      schema: integer,
      optional: true,
    });
  });

  it("names the parameter whose type is not written and the metadata cannot say", () => {
    expect(() => checkedOf(undefined, Recorded, undefined, 0)).toThrow(
      "the constructor of Recorded: the type of parameter 1 cannot be read from the metadata, so its request must write it",
    );
  });
});

describe("requireMetadata", () => {
  it("accepts a decorated method, whose parameters the compiler recorded", () => {
    expect(() => {
      requireMetadata(Recorded.prototype, "withDefault");
    }).not.toThrow();
  });

  it("names the compiler option when nothing was recorded", () => {
    expect(() => {
      requireMetadata(Recorded.prototype, "withoutMetadata");
    }).toThrow(
      "Recorded.withoutMetadata: itinera's decorators need the compiler option emitDecoratorMetadata",
    );
  });
});
