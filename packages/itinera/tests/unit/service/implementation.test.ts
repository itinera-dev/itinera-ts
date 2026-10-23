import { describe, expect, it } from "vitest";
import { implementationOf } from "../../../src/service/implementation.js";
import { serviceType } from "../../../src/service/request.js";

const GATEWAY = serviceType<unknown>("Gateway");

class Terminal {
  readonly label = "terminal";
}

class Renamed {
  readonly label = "renamed";

  static get name(): string {
    throw new Error("a getter was called");
  }
}

const throwingTrap = new Proxy(
  {},
  {
    getPrototypeOf(): never {
      throw new Error("a trap was called");
    },
  },
);

describe("implementationOf", () => {
  it.each([
    ["the name of its class", new Terminal(), "Terminal"],
    ["the service type's, for a plain object", {}, "Gateway"],
    [
      "the service type's, for an object with no prototype",
      Object.create(null),
      "Gateway",
    ],
    [
      "the service type's, for an anonymous class",
      new (class {
        readonly label = "anonymous";
      })(),
      "Gateway",
    ],
    ["the service type's, for a function", String, "Gateway"],
    ["the service type's, for a string", "terminal", "Gateway"],
    [
      "the service type's, for a class whose name is a getter",
      new Renamed(),
      "Gateway",
    ],
    [
      "the service type's, for a proxy whose trap throws",
      throwingTrap,
      "Gateway",
    ],
  ])("names an instance after %s", (_, instance, implementation) => {
    expect(implementationOf(instance, GATEWAY)).toBe(implementation);
  });
});
