import { describe, expect, it } from "vitest";
import { refuseStaticData } from "../../../src/declaration/static-data.js";

const hidden = Symbol("hidden");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a base class with only static data shows that its own statics are left alone
class Base {
  static shared = 0;
}

describe("refuseStaticData", () => {
  it.each([
    [
      "a field",
      class Charge extends Base {
        static charged = 0;
      },
      "charged",
    ],
    [
      "a field named by a symbol",
      class Charge extends Base {
        static [hidden] = 0;
      },
      "Symbol(hidden)",
    ],
    [
      "an accessor",
      class Charge extends Base {
        static get charged(): number {
          return 0;
        }
      },
      "charged",
    ],
    [
      "an accessor returning a function",
      class Charge extends Base {
        static get charge(): () => number {
          return () => 0;
        }
      },
      "charge",
    ],
    [
      "a field that hides the class's own name",
      class Charge extends Base {
        static override name = "Charge";
      },
      "name",
    ],
    [
      "a field of a class between it and its base class",
      class Charge extends class Counted extends Base {
        static counted = 0;
      } {},
      "counted",
    ],
  ])("refuses a class keeping static data in %s", (_, target, data) => {
    expect(() => {
      refuseStaticData(target, Base, "step");
    }).toThrow(
      `step Charge keeps static data, which everything built from it would share: ${data}`,
    );
  });

  it("names every static property holding data", () => {
    class Charge extends Base {
      static charged = 0;
      static refunded = 0;
    }
    expect(() => {
      refuseStaticData(Charge, Base, "step");
    }).toThrow(": charged, refunded");
  });

  it("accepts static methods, and leaves the base class's statics alone", () => {
    class Charge extends Base {
      static cents(euros: number): number {
        return euros * 100;
      }
    }
    expect(() => {
      refuseStaticData(Charge, Base, "step");
    }).not.toThrow();
  });
});
